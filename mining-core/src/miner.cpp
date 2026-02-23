#include "miner.h"
#include "hash.h"
#include <chrono>
#include <iostream>
#include <cstring>
#include <vector>
#include <thread>
#include <mutex>

namespace kuzadesign {

Miner::Miner() {
}

Miner::~Miner() {
    stop();
}

bool Miner::start(const MiningConfig& config) {
    if (running) {
        return false;
    }

    running = true;
    stats = MiningStats();
    m_totalHashes = 0;
    m_sharesAccepted = 0;
    m_startTime = std::chrono::steady_clock::now();

    // Create worker threads
    for (int i = 0; i < config.numThreads; i++) {
        workers.emplace_back(&Miner::workerThread, this, i);
    }

    std::cout << "Mining started with " << config.numThreads << " threads" << std::endl;
    return true;
}

void Miner::stop() {
    if (!running) {
        return;
    }

    running = false;
    
    // Wait for workers to finish
    for (auto& worker : workers) {
        if (worker.joinable()) {
            worker.join();
        }
    }
    
    workers.clear();
    std::cout << "Mining stopped" << std::endl;
}

bool Miner::isRunning() const {
    return running;
}

MiningStats Miner::getStats() const {
    MiningStats s = stats;
    s.sharesAccepted = m_sharesAccepted.load();
    
    auto now = std::chrono::steady_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - m_startTime).count() / 1000.0;
    
    if (elapsed > 0.1) {
        s.hashrate = m_totalHashes.load() / elapsed;
    } else {
        s.hashrate = 0;
    }
    
    return s;
}

void Miner::setShareCallback(ShareCallback callback) {
    shareCallback = callback;
}

void Miner::setJob(const stratum::Job& job) {
    std::lock_guard<std::mutex> lock(jobMutex);
    currentJob = job;
    hasJob = true;
    // std::cout << "Miner received new job: " << job.jobId << std::endl;
}

void Miner::workerThread(int threadId) {
    std::cout << "Worker " << threadId << " started" << std::endl;
    
    uint64_t nonce = threadId * 1000000000ULL; // Big offset
    uint64_t hashCount = 0;
    auto startTime = std::chrono::steady_clock::now();
    
    stratum::Job localJob;
    bool visibleJob = false;
    
    while (running) {
        // Check for new job
        if (hashCount % 1000 == 0 || !visibleJob) {
            std::lock_guard<std::mutex> lock(jobMutex);
            if (hasJob) {
                if (localJob.jobId != currentJob.jobId || localJob.cleanJobs) {
                    localJob = currentJob;
                    visibleJob = true;
                    // std::cout << "Thread " << threadId << " picked up job " << localJob.jobId << std::endl;
                }
            }
        }
        
        if (!visibleJob) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            continue;
        }

        // --- Block Construction (Kaspa) ---
        // Header (32) + Timestamp (8) + Zeroes (32) + Nonce (8)
        std::vector<uint8_t> input;
        input.reserve(32 + 8 + 32 + 8);
        
        // 1. PrePowHash
        if(localJob.header.size() < 32) {
             localJob.header.resize(32, 0); 
        }
        input.insert(input.end(), localJob.header.begin(), localJob.header.end());
        
        // 2. Timestamp (Little Endian)
        uint64_t ts = localJob.timestamp;
        for(int i=0; i<8; i++) input.push_back((ts >> (i*8)) & 0xFF);
        
        // 3. Zeroes
        for(int i=0; i<32; i++) input.push_back(0);
        
        // 4. Nonce placeholder (will be set in loop)
        for(int i=0; i<8; i++) input.push_back(0);
        
        // --- Loop ---
        for (int i = 0; i < 2000; i++) {
            // Set Nonce at end of input
            for(int j=0; j<8; j++) {
                input[input.size() - 8 + j] = (nonce >> (j*8)) & 0xFF;
            }
            
            // Hash
            auto hash = calculateHash(input, 0); 
            hashCount++;
            
            // Check Difficulty
            if (checkDifficulty(hash, localJob.target)) {
                std::cout << "Worker " << threadId << " found share! Nonce: " << nonce << std::endl;
                m_sharesAccepted++;
                
                if (shareCallback) {
                    shareCallback(true, "Share found", localJob.jobId, 0, nonce, (uint32_t)ts);
                }
            }
            nonce++;
        }
        
        m_totalHashes += 2000;

        // Log hashrate for CLI verification (Thread 0 only to avoid spam)
        if (threadId == 0 && hashCount % 100000 == 0) {
             double currentHr = m_totalHashes.load() / std::chrono::duration_cast<std::chrono::seconds>(std::chrono::steady_clock::now() - startTime).count();
             // std::cout << "[Miner] Cumulative Hashrate: " << currentHr << " H/s" << std::endl;
        }
    }
    
    std::cout << "Worker " << threadId << " stopped" << std::endl;
}

void Miner::updateHashrate() {
}

} // namespace kuzadesign
