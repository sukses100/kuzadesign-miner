const addon = require('./build/Release/mining_addon.node');

console.log('Addon loaded:', addon);

try {
    const config = {
        pool: { url: "127.0.0.1:5555" },
        wallet: { address: "kuzadesign:qq6m7k9d08779m436402685867803525254823868666" },
        mining: { threads: 2, intensity: 0.8 }
    };

    console.log('Starting miner...');
    const result = addon.start(config);
    console.log('Start result:', result);

    setInterval(() => {
        const stats = addon.getStats();
        console.log('Stats:', stats);

        if (stats.uptime > 5) {
            // Keep running to get shares
        }
    }, 1000);

    setTimeout(() => {
        console.log('Stopping miner...');
        addon.stop();
        console.log('Miner stopped.');
        process.exit(0);
    }, 10000); // Run for 10 seconds to ensure connection

} catch (e) {
    console.error('Error:', e);
}
