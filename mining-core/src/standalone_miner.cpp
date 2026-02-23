#include "miner.h"
#include "stratum.h"
#include <iostream>
#include <thread>
#include <chrono>
#include <string>
#include <vector>
#include <signal.h>

using namespace kuzadesign;

bool g_running = true;

void signalHandler(int signum) {
    std::cout << "\nInterrupt signal (" << signum << ") received. Stopping...\n";
    g_running = false;
}

int main(int argc, char** argv) {
    signal(SIGINT, signalHandler);

    std::string host = "144.91.66.97";
    int port = 5555;
    std::string user = "kuzadesign:qqpqx7vz0y444gx6k2w42vz83h5p785ygu97z30y5y";
    int threads = 2;

    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        if (arg == "--host" && i + 1 < argc) host = argv[++i];
        else if (arg == "--port" && i + 1 < argc) port = std::stoi(argv[++i]);
        else if (arg == "--user" && i + 1 < argc) user = argv[++i];
        else if (arg == "--threads" && i + 1 < argc) threads = std::stoi(argv[++i]);
    }

    std::cout << "Kuzadesign Standalone Miner v1.0 (Windows Fallback)\n";
    std::cout << "Target: " << host << ":" << port << "\n";
    std::cout << "Wallet: " << user << "\n";
    std::cout << "Threads: " << threads << "\n";

    Miner miner;
    stratum::Client client;

    client.onJob([&miner](const stratum::Job& job) {
        miner.setJob(job);
    });

    miner.setShareCallback([&client](bool accepted, const std::string& reason, 
                                     const std::string& jobId, uint64_t extraNonce2, 
                                     uint64_t nonce, uint32_t ntime) {
        client.submit(jobId, ntime, nonce, extraNonce2);
    });

    MiningConfig config;
    config.numThreads = threads;
    miner.start(config);

    if (!client.connect(host, port)) {
        std::cerr << "CRITICAL: Failed to connect to pool\n";
        return 1;
    }

    client.subscribe("kzd-standalone/1.0");
    client.login(user, "x");

    while (g_running) {
        client.process();
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        
        static int counter = 0;
        if (counter++ % 50 == 0) {
            auto stats = miner.getStats();
            // Format strictly for Electron to parse: [STATS]|hashrate|shares
            std::cout << "[STATS]|" << stats.hashrate << "|" << stats.sharesAccepted << std::endl;
        }
    }

    miner.stop();
    client.disconnect();
    return 0;
}
