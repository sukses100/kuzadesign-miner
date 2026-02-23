#include "../../include/stratum.h"
#include <iostream>
#include <cstring>
#include <sstream>
#include <cstdlib>
#include <thread>
#include <chrono>

#ifndef _WIN32
    #include <sys/socket.h>
    #include <arpa/inet.h>
    #include <netdb.h>
    #include <unistd.h>
    #include <fcntl.h>
#else
    #include <winsock2.h>
    #include <ws2tcpip.h>
    #include <thread>
    #include <chrono>
#endif

namespace kuzadesign {
namespace stratum {

Client::Client() : socket_fd(INVALID_SOCKET_VAL), connected(false) {
#ifdef _WIN32
    WSADATA wsaData;
    WSAStartup(MAKEWORD(2, 2), &wsaData);
#endif
}

Client::~Client() {
    disconnect();
#ifdef _WIN32
    WSACleanup();
#endif
}

bool Client::connect(const std::string& host, int port) {
    this->host = host;
    this->port = port;
    
    struct hostent *server = gethostbyname(host.c_str());
    if (server == NULL) {
        std::cerr << "Error: No such host " << host << std::endl;
        return false;
    }

    socket_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (socket_fd < 0) {
        std::cerr << "Error opening socket" << std::endl;
        return false;
    }

    struct sockaddr_in serv_addr;
    std::memset(&serv_addr, 0, sizeof(serv_addr));
    serv_addr.sin_family = AF_INET;
    std::memcpy(&serv_addr.sin_addr.s_addr, server->h_addr, server->h_length);
    serv_addr.sin_port = htons(port);

    if (::connect(socket_fd, (struct sockaddr *)&serv_addr, sizeof(serv_addr)) < 0) {
#ifdef _WIN32
        int err = WSAGetLastError();
        if (err != WSAEWOULDBLOCK) {
            std::cerr << "Error connecting to " << host << ":" << port << " (Win Error: " << err << ")" << std::endl;
            closesocket(socket_fd);
            socket_fd = INVALID_SOCKET_VAL;
            return false;
        }
#else
        std::cerr << "Error connecting to " << host << ":" << port << std::endl;
        close(socket_fd);
        socket_fd = INVALID_SOCKET_VAL;
        return false;
#endif
    }

    // Set non-blocking
#ifdef _WIN32
    u_long mode = 1;
    ioctlsocket(socket_fd, FIONBIO, &mode);
#else
    int flags = fcntl(socket_fd, F_GETFL, 0);
    fcntl(socket_fd, F_SETFL, flags | O_NONBLOCK);
#endif

    connected = true;
    std::cout << "Connected to " << host << ":" << port << std::endl;
    return true;
}

void Client::disconnect() {
    if (socket_fd != INVALID_SOCKET_VAL) {
#ifdef _WIN32
        closesocket(socket_fd);
#else
        close(socket_fd);
#endif
        socket_fd = INVALID_SOCKET_VAL;
    }
    connected = false;
}

bool Client::isConnected() const {
    return connected;
}

void Client::process() {
    if (!connected || socket_fd < 0) return;

    char buffer[4096];
    ssize_t_compat n = recv(socket_fd, buffer, sizeof(buffer) - 1, 0);

    if (n > 0) {
        buffer[n] = 0;
        recvBuffer.append(buffer);

        // Process lines
        size_t pos = 0;
        while ((pos = recvBuffer.find('\n')) != std::string::npos) {
            std::string line = recvBuffer.substr(0, pos);
            recvBuffer.erase(0, pos + 1);
            if (!line.empty()) {
                handleMessage(line);
            }
        }
    } else if (n == 0) {
        // Connection closed
        std::cout << "Connection closed by server" << std::endl;
        disconnect();
    } else {
        // Error or EWOULDBLOCK
#ifdef _WIN32
        int err = WSAGetLastError();
        if (err != WSAEWOULDBLOCK) {
             std::cerr << "Socket error: " << err << std::endl;
             disconnect();
        }
#else
        if (errno != EWOULDBLOCK && errno != EAGAIN) {
             std::cerr << "Socket error: " << strerror(errno) << std::endl;
             disconnect();
        }
#endif
    }
}

bool Client::sendJson(cJSON* json) {
    if (!connected) return false;

    char* str = cJSON_PrintUnformatted(json);
    if (!str) return false;

    std::string msg = std::string(str) + "\n";
    free(str); 

    std::lock_guard<std::mutex> lock(sendMutex);
    
    size_t totalSent = 0;
    while (totalSent < msg.length()) {
        ssize_t_compat n = send(socket_fd, msg.c_str() + totalSent, msg.length() - totalSent, 0);
        
        if (n < 0) {
#ifdef _WIN32
            int err = WSAGetLastError();
            if (err == WSAEWOULDBLOCK) {
                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                continue;
            }
            std::cerr << "Error sending data: " << err << std::endl;
#else
            if (errno == EAGAIN || errno == EWOULDBLOCK) {
                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                continue;
            }
            std::cerr << "Error sending data: " << strerror(errno) << std::endl;
#endif
            return false;
        }
        totalSent += n;
    }
    
    return true;
}

void Client::handleMessage(const std::string& line) {
    // std::cout << "RECV: " << line << std::endl;
    
    cJSON* json = cJSON_Parse(line.c_str());
    if (!json) {
        std::cerr << "Failed to parse JSON: " << line << std::endl;
        return;
    }
    
    if (cJSON_GetObjectItem(json, "method")) {
        char* methodCpr = cJSON_GetObjectItem(json, "method")->valuestring;
        std::string method = methodCpr ? methodCpr : "";
        cJSON* params = cJSON_GetObjectItem(json, "params");
        
        // KASPA PROTOCOL: mining.notify(jobId, headerHash, timestamp)
        if (method == "mining.notify" && params && cJSON_GetArraySize(params) >= 3) {
            Job job;
            cJSON* jId = cJSON_GetArrayItem(params, 0);
            job.jobId = jId->valuestring ? jId->valuestring : "";
            
            // Param 1: Header Hash (Pre-Pow) - 32 bytes hex OR array of 4 uint64s
            cJSON* headerParam = cJSON_GetArrayItem(params, 1);
            if (cJSON_IsArray(headerParam)) {
                // It's [u64, u64, u64, u64]
                job.header.resize(32);
                for (int i = 0; i < 4 && i < cJSON_GetArraySize(headerParam); i++) {
                     cJSON* item = cJSON_GetArrayItem(headerParam, i);
                     uint64_t val = 0;
                     if(cJSON_IsNumber(item)) val = (uint64_t)item->valuedouble;
                     else if(cJSON_IsString(item) && item->valuestring) val = strtoull(item->valuestring, NULL, 10);
                     
                     // Little Endian in Kaspa
                     memcpy(job.header.data() + (i * 8), &val, 8);
                }
            } else if (cJSON_IsString(headerParam) && headerParam->valuestring) {
                job.header = hexToBytes(headerParam->valuestring);
            }
            
            // Param 2: Timestamp
            cJSON* tsParam = cJSON_GetArrayItem(params, 2);
            if (cJSON_IsNumber(tsParam)) job.timestamp = (uint64_t)tsParam->valuedouble;
            else if (cJSON_IsString(tsParam) && tsParam->valuestring) job.timestamp = strtoull(tsParam->valuestring, NULL, 10);
            
            job.cleanJobs = true;
            
            // Fake Target (Difficulty 1)
            job.target = std::vector<uint8_t>(32, 0xFF); 
            job.target[0] = 0; job.target[1] = 0; // Fake difficulty
            
            std::cout << "Received Job: " << job.jobId << std::endl;
            
            if (jobCallback) {
                jobCallback(job);
            }
        }
    }
    
    // Check for result (response to login/submit/subscribe)
    if (cJSON_GetObjectItem(json, "result")) {
        cJSON* result = cJSON_GetObjectItem(json, "result");
        
        if (cJSON_IsArray(result)) {
             // Just accept it
             std::cout << "Subscribed!" << std::endl;
        }
        else if (cJSON_IsTrue(result)) {
             std::cout << "Stratum: Share Accepted by Pool!" << std::endl;
        }
    }
    
    cJSON_Delete(json);
}

bool Client::subscribe(const std::string& userAgent) {
    cJSON* root = cJSON_CreateObject();
    cJSON_AddNumberToObject(root, "id", 1);
    cJSON_AddStringToObject(root, "method", "mining.subscribe");
    
    cJSON* params = cJSON_CreateArray();
    cJSON_AddItemToArray(params, cJSON_CreateString(userAgent.c_str()));
    cJSON_AddItemToObject(root, "params", params);

    bool result = sendJson(root);
    cJSON_Delete(root);
    return result;
}

bool Client::login(const std::string& user, const std::string& password) {
    cJSON* root = cJSON_CreateObject();
    cJSON_AddNumberToObject(root, "id", 1);
    cJSON_AddStringToObject(root, "method", "mining.authorize");
    
    cJSON* params = cJSON_CreateArray();
    cJSON_AddItemToArray(params, cJSON_CreateString(user.c_str()));
    cJSON_AddItemToArray(params, cJSON_CreateString(password.c_str()));
    cJSON_AddItemToObject(root, "params", params);

    bool result = sendJson(root);
    cJSON_Delete(root);
    return result;
}

bool Client::submit(const std::string& jobId, uint32_t ntime, uint64_t nonce, uint64_t extraNonce2) {
    cJSON* root = cJSON_CreateObject();
    cJSON_AddNumberToObject(root, "id", 4);
    cJSON_AddStringToObject(root, "method", "mining.submit");

    // Bridge expects: [workerName, jobId, nonceHex]
    cJSON* params = cJSON_CreateArray();
    cJSON_AddItemToArray(params, cJSON_CreateString("generic"));
    cJSON_AddItemToArray(params, cJSON_CreateString(jobId.c_str()));

    // FIX: Buffer was 32 bytes — too small when assembled with the JSON string,
    // causing truncation that dropped the closing "}" bracket and triggered
    // "unexpected end of JSON input" disconnects in the stratum bridge.
    char nonceHex[64];
    snprintf(nonceHex, sizeof(nonceHex), "%016llx", (long long unsigned int)nonce);
    cJSON_AddItemToArray(params, cJSON_CreateString(nonceHex));

    cJSON_AddItemToObject(root, "params", params);

    bool result = sendJson(root);
    cJSON_Delete(root);
    return result;
}

void Client::onJob(std::function<void(const Job&)> callback) {
    jobCallback = callback;
}

} // namespace stratum
} // namespace kuzadesign
