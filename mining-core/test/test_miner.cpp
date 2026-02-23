#include "miner.h"
#include "stratum.h"
#include <iostream>
#include <unistd.h>
#include <cstdlib>

using namespace kuzadesign;

int main(int argc, char** argv) {
    if (argc < 3) {
        std::cerr << "Usage: test_miner <host> <port> [user] [pass]" << std::endl;
        return 1;
    }

    std::string host = argv[1];
    int port = std::atoi(argv[2]);
    std::string user = (argc > 3) ? argv[3] : "testuser";
    std::string pass = (argc > 4) ? argv[4] : "x";

    Miner miner;
    stratum::Client client;

    // Link Client -> Miner
    client.onJob([&miner](const stratum::Job& job) {
        std::cout << "[Test] Received job " << job.jobId << ", updating miner..." << std::endl;
        miner.setJob(job);
    });

    // Link Miner -> Client
    miner.setShareCallback([&client](bool accepted, const std::string& reason, 
                                     const std::string& jobId, uint64_t extraNonce2, 
                                     uint64_t nonce, uint32_t ntime) {
        std::cout << "[Test] Found share! JobId: " << jobId << ", Nonce: " << nonce << std::endl;
        client.submit(jobId, ntime, nonce, extraNonce2);
    });

    // Start Miner
    MiningConfig config;
    config.numThreads = 2; 
    miner.start(config);

    // Connect Client
    std::cout << "Connecting to " << host << ":" << port << "..." << std::endl;
    if (!client.connect(host, port)) {
        std::cerr << "Failed to connect to pool" << std::endl;
        return 1;
    }

    // Subscribe
    std::cout << "Subscribing..." << std::endl;
    if (!client.subscribe("kuzadesign-miner/1.0")) {
         std::cerr << "Subscribe failed" << std::endl;
    }
    
    // Authorize
    std::cout << "Logging in as " << user << "..." << std::endl;
    if (!client.login(user, pass)) {
        std::cerr << "Login failed" << std::endl;
    }

    // Run loop
    std::cout << "Running miner loop (Press Ctrl+C to stop)..." << std::endl;
    while (true) {
        client.process();
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        
        // Print stats occasionally
        static int counter = 0;
        if (counter++ % 50 == 0) {
            auto stats = miner.getStats();
            std::cout << "Hashrate: " << stats.hashrate << " H/s | Shares: " << stats.sharesAccepted << std::endl;
        }
    }

    miner.stop();
    return 0;
}
