const miningAddon = require('./mining-addon');

const config = {
    pool: { url: 'localhost:5555' },
    wallet: { address: 'kuzadesign:qzhah2np03a5rwp2zdev07kp92s93409g9lvm97uy4ddrm3fegtsgdzyk82fw' },
    mining: { threads: 1, intensity: 0.5 }
};

console.log('Starting mining test...');
miningAddon.start(config).then(result => {
    console.log('Start Result:', result);

    // Check stats after 5 seconds
    setTimeout(async () => {
        const stats = await miningAddon.getStats();
        console.log('Stats:', stats);

        // Stop after 10 seconds total
        setTimeout(async () => {
            console.log('Stopping...');
            await miningAddon.stop();
            console.log('Stopped.');
            process.exit(0);
        }, 5000);
    }, 5000);
}).catch(err => {
    console.error('Start Error:', err);
    process.exit(1);
});
