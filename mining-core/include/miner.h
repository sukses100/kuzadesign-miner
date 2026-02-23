#ifndef KUZADESIGN_MINER_H
#define KUZADESIGN_MINER_H

#include <string>
#include <thread>
#include <vector>
#include <atomic>
#include <functional>
#include <mutex>
#include "stratum.h"

namespace kuzadesign {

struct MiningConfig {
    std::string poolUrl;
    std::string walletAddress;
    int numThreads = 4;
    float intensity = 0.75f;
};

struct MiningStats {
    double hashrate = 0.0;
    uint64_t sharesAccepted = 0;
    uint64_t sharesRejected = 0;
    uint64_t uptime = 0;
    bool connected = false;
    float cpuTemp = 0.0f;
    float cpuUsage = 0.0f;
};

class Miner {
public:
    Miner();
    ~Miner();

    // Control
    bool start(const MiningConfig& config);
    void stop();
    bool isRunning() const;
    
    // Job management
    void setJob(const stratum::Job& job);

    // Stats
    MiningStats getStats() const;

    // Callbacks
    // Callback signature: accepted, reason, jobId, extraNonce2, nonce, ntime
    using ShareCallback = std::function<void(bool accepted, const std::string& reason, 
                                             const std::string& jobId, uint64_t extraNonce2, 
                                             uint64_t nonce, uint32_t ntime)>;
    void setShareCallback(ShareCallback callback);

private:
    std::vector<std::thread> workers;
    std::atomic<bool> running{false};
    MiningStats stats;
    ShareCallback shareCallback;
    
    // Atomic counters for thread-safe aggregation
    std::atomic<uint64_t> m_totalHashes{0};
    std::atomic<uint64_t> m_sharesAccepted{0};
    std::chrono::steady_clock::time_point m_startTime;
    
    // Current Job
    stratum::Job currentJob;
    std::mutex jobMutex;
    bool hasJob = false;

    void workerThread(int threadId);
    void updateHashrate();
};

} // namespace kuzadesign

#endif // KUZADESIGN_MINER_H
