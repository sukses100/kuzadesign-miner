const StratumClient = require('./stratum-client');

const client = new StratumClient('localhost', 5555, 'kuzadesign:qqpqx7vz0y444gx6k2w42vz83h5p785ygu97z30y5y');

client.onJob((job) => {
    console.log('Test: Received Job', job.jobId);
    process.exit(0);
});

client.onStats((type) => {
    console.log('Test: Stats', type);
});

console.log('Test: Connecting...');
client.connect();

setTimeout(() => {
    console.log('Test: Timeout - No job received');
    process.exit(1);
}, 10000);
