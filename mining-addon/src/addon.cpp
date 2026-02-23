#include <napi.h>
#include "miner.h"
#include "stratum.h"
#include <memory>
#include <thread>
#include <iostream>
#include <sstream>

using namespace Napi;

// Global instances
std::unique_ptr<kuzadesign::Miner> globalMiner;
std::unique_ptr<kuzadesign::stratum::Client> globalClient;
std::thread clientThread;
bool clientRunning = false;

// Helper to parse "host:port" or "stratum+tcp://host:port"
void parsePoolUrl(const std::string& url, std::string& host, int& port) {
    std::string cleanUrl = url;
    size_t protocolPos = cleanUrl.find("://");
    if (protocolPos != std::string::npos) {
        cleanUrl = cleanUrl.substr(protocolPos + 3);
    }
    
    size_t colonPos = cleanUrl.find(':');
    if (colonPos != std::string::npos) {
        host = cleanUrl.substr(0, colonPos);
        port = std::stoi(cleanUrl.substr(colonPos + 1));
    } else {
        host = cleanUrl;
        port = 3333; // Default
    }
}

// Start mining
Value StartMining(const CallbackInfo& info) {
    Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsObject()) {
        TypeError::New(env, "Config object required").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    Object config = info[0].As<Object>();
    
    // Parse config
    std::string poolUrl = config.Get("pool").As<Object>().Get("url").As<String>().Utf8Value();
    std::string walletAddr = config.Get("wallet").As<Object>().Get("address").As<String>().Utf8Value();
    int threads = config.Get("mining").As<Object>().Get("threads").As<Number>().Int32Value();
    double intensity = config.Get("mining").As<Object>().Get("intensity").As<Number>().FloatValue();
    
    // Stop if already running
    if (globalMiner) globalMiner->stop();
    if (globalClient) globalClient->disconnect();
    if (clientThread.joinable()) {
        clientRunning = false;
        clientThread.join();
    }

    // Initialize components
    globalMiner = std::make_unique<kuzadesign::Miner>();
    globalClient = std::make_unique<kuzadesign::stratum::Client>();
    
    // Setup callbacks
    globalClient->onJob([](const kuzadesign::stratum::Job& job) {
        if (globalMiner) globalMiner->setJob(job);
    });
    
    globalMiner->setShareCallback([](bool found, const std::string& reason, 
                                     const std::string& jobId, uint64_t en2, 
                                     uint64_t nonce, uint32_t ntime) {
        if (globalClient) {
            globalClient->submit(jobId, ntime, nonce, en2);
        }
    });

    // Parse Pool URL
    std::string host;
    int port;
    parsePoolUrl(poolUrl, host, port);
    
    // Connect to pool
    if (!globalClient->connect(host, port)) {
        // Return failure but don't crash
        Object result = Object::New(env);
        result.Set("success", Boolean::New(env, false));
        result.Set("error", String::New(env, "Failed to connect to pool"));
        return result;
    }
    
    // Login/Subscribe
    globalClient->subscribe("kuzadesign-miner/1.0");
    globalClient->login(walletAddr, "x");
    
    // Start Miner
    kuzadesign::MiningConfig mineConfig;
    mineConfig.numThreads = threads;
    mineConfig.intensity = intensity;
    globalMiner->start(mineConfig);
    
    // Start Network Thread
    clientRunning = true;
    clientThread = std::thread([]() {
        while (clientRunning && globalClient && globalClient->isConnected()) {
            globalClient->process();
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    });
    
    Object result = Object::New(env);
    result.Set("success", Boolean::New(env, true));
    
    return result;
}

// Stop mining
Value StopMining(const CallbackInfo& info) {
    Env env = info.Env();
    
    if (globalMiner) globalMiner->stop();
    if (globalClient) globalClient->disconnect();
    
    clientRunning = false;
    if (clientThread.joinable()) {
        clientThread.join();
    }
    
    Object result = Object::New(env);
    result.Set("success", Boolean::New(env, true));
    
    return result;
}

// Get mining stats
Value GetStats(const CallbackInfo& info) {
    Env env = info.Env();
    
    Object stats = Object::New(env);
    
    if (globalMiner) {
        auto minerStats = globalMiner->getStats();
        
        stats.Set("hashrate", Number::New(env, minerStats.hashrate));
        
        Object shares = Object::New(env);
        shares.Set("accepted", Number::New(env, minerStats.sharesAccepted));
        shares.Set("rejected", Number::New(env, minerStats.sharesRejected));
        stats.Set("shares", shares);
        
        stats.Set("uptime", Number::New(env, minerStats.uptime));
        stats.Set("connected", Boolean::New(env, globalClient && globalClient->isConnected()));
        stats.Set("cpuTemp", Number::New(env, minerStats.cpuTemp));
        stats.Set("cpuUsage", Number::New(env, minerStats.cpuUsage));
    } else {
        stats.Set("hashrate", Number::New(env, 0));
        Object shares = Object::New(env);
        shares.Set("accepted", Number::New(env, 0));
        shares.Set("rejected", Number::New(env, 0));
        stats.Set("shares", shares);
        stats.Set("uptime", Number::New(env, 0));
        stats.Set("connected", Boolean::New(env, false));
    }
    
    return stats;
}

// Initialize addon
Object Init(Env env, Object exports) {
    exports.Set("start", Function::New(env, StartMining));
    exports.Set("stop", Function::New(env, StopMining));
    exports.Set("getStats", Function::New(env, GetStats));
    
    return exports;
}

NODE_API_MODULE(mining_addon, Init)
