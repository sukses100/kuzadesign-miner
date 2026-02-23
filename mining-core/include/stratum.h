#ifndef STRATUM_H
#define STRATUM_H

#include <string>
#include <vector>
#include <functional>
#include <atomic>
#include <mutex>
#include "hash.h"

extern "C" {
#include "../src/json/cJSON.h"
}

#ifdef _WIN32
    #include <winsock2.h>
    #include <ws2tcpip.h>
    typedef SOCKET socket_t;
    typedef int ssize_t_compat;
    #define INVALID_SOCKET_VAL INVALID_SOCKET
    #define SOCKET_ERROR_VAL SOCKET_ERROR
#else
    #include <sys/socket.h>
    #include <arpa/inet.h>
    #include <netdb.h>
    #include <unistd.h>
    #include <fcntl.h>
    typedef int socket_t;
    typedef ssize_t ssize_t_compat;
    #define INVALID_SOCKET_VAL -1
    #define SOCKET_ERROR_VAL -1
#endif

namespace kuzadesign {
namespace stratum {

struct Job {
    std::string jobId;
    std::vector<uint8_t> header; // 32 byte pre-pow hash
    uint64_t timestamp;
    bool cleanJobs;
    
    // Calculated target
    std::vector<uint8_t> target;
    
    // From subscribe
    std::vector<uint8_t> extraNonce1;
    int extraNonce2Size;
};

class Client {
public:
    Client();
    ~Client();

    bool connect(const std::string& host, int port);
    void disconnect();
    bool isConnected() const;

    // Stratum V1 methods
    bool login(const std::string& user, const std::string& password);
    bool subscribe(const std::string& userAgent);
    bool submit(const std::string& jobId, uint32_t ntime, uint64_t nonce, uint64_t extraNonce2);
    
    // Callbacks
    void onJob(std::function<void(const Job&)> callback);
    
    // Main loop for checking socket events (non-blocking or blocking with timeout)
    void process();

private:
    socket_t socket_fd;
    bool connected;
    std::string host;
    int port;
    std::mutex sendMutex;
    
    // Buffer for received data
    std::string recvBuffer;
    
    std::function<void(const Job&)> jobCallback;
    
    // Session data
    std::vector<uint8_t> extraNonce1;
    int extraNonce2Size = 4;
    
    // Protocol handling
    void handleMessage(const std::string& line);
    bool sendJson(cJSON* json);
    
    // Helpers
    std::vector<std::string> split(const std::string& s, char delimiter);
};

} // namespace stratum
} // namespace kuzadesign

#endif // STRATUM_H
