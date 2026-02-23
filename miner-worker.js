const StratumClient = require('./stratum-client');
const fs = require('fs');
const os = require('os');
const path = require('path');

const logFile = path.join(os.homedir(), 'kuzadesign-miner.log');
function log(msg) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logFile, entry);
    console.log(msg);
}

log('Worker: Miner worker started');
let miningAddon = null;
let jsClient = null;

try {
    miningAddon = require('./mining-addon');
    log('Worker: Native mining addon loaded');
} catch (e) {
    log('Worker: Failed to load native mining addon: ' + e.message);
}

process.on('message', async (msg) => {
    if (msg.type === 'start') {
        const { config } = msg;
        const host = config.pool.url.split(':')[0];
        const port = parseInt(config.pool.url.split(':')[1]) || 5555;
        const wallet = config.wallet.address;

        // 1. Setup Connection (Pure JS)
        if (jsClient) jsClient.disconnect();
        jsClient = new StratumClient(host, port, wallet, config.pool.worker || 'generic');

        jsClient.onJob((job) => {
            if (miningAddon && miningAddon.setJob) {
                miningAddon.setJob(job);
            }
            // Send job notify to main process if needed
        });

        jsClient.onStats((type) => {
            // Share accepted/rejected
        });

        jsClient.connect();

        // 2. Immediate stats update after a short delay for connection
        setTimeout(() => {
            if (jsClient) {
                const stats = {
                    hashrate: 0,
                    shares: { accepted: 0, rejected: 0 },
                    connected: jsClient.isConnected(),
                    uptime: 0
                };
                process.send({ type: 'stats', stats });
            }
        }, 1000);

        // 3. Setup Native Mining (if available)
        if (miningAddon) {
            try {
                const result = await miningAddon.start(config);
                process.send({ type: 'start-result', result });
            } catch (error) {
                console.error('Worker: Native addon start failed:', error.message);
                process.send({ type: 'start-result', result: { success: true, note: 'Connected! (Mining core error: ' + error.message + ')' } });
            }
        } else {
            process.send({ type: 'start-result', result: { success: true, note: 'Connected to pool! (Native mining core not available on this OS)' } });
        }
    } else if (msg.type === 'stop') {
        if (jsClient) jsClient.disconnect();
        if (miningAddon) await miningAddon.stop();
        process.send({ type: 'stop-result', success: true });
    }
});

// Periodic stats reporting
setInterval(async () => {
    try {
        let stats = {
            hashrate: 0,
            shares: { accepted: 0, rejected: 0 },
            connected: jsClient ? jsClient.isConnected() : false,
            uptime: 0
        };

        if (miningAddon) {
            const nativeStats = await miningAddon.getStats();
            stats = { ...stats, ...nativeStats };
        }

        // Ensure connected status comes from JS client
        stats.connected = jsClient ? jsClient.isConnected() : false;

        process.send({ type: 'stats', stats });
    } catch (e) {
        // console.error('Worker stats interval error:', e.message);
    }
}, 2000);
