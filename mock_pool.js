const net = require('net');

const PORT = 5555;
// Mock Job
// mining.notify: [jobId, prevHash, coinb1, coinb2, merkleBranches, version, nbits, ntime, cleanJobs]
const MOCK_JOB = [
    "job1",
    "0000000000000000000000000000000000000000000000000000000000000000", // prevHash
    "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff20020000", // coinb1
    "ffffffff0100f2052a010000001976a9146f3a3a6f3a3a6f3a3a6f3a3a6f3a3a6f3a3a6f3a88ac00000000", // coinb2
    [], // branches
    "20000000", // version
    "1d00ffff", // nbits (easier difficulty for test)
    "533c3914", // ntime
    true
];

const server = net.createServer((socket) => {
    console.log('Client connected');
    let subscriptionId = null;
    let authorized = false;

    socket.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            console.log('RECV:', line);

            try {
                const msg = JSON.parse(line);
                let response = null;

                if (msg.method === 'mining.subscribe') {
                    // Result: [[ ["mining.set_difficulty", "subscriptionId"], ["mining.notify", "subscriptionId"] ], "extraNonce1", extraNonce2_size]
                    response = {
                        id: msg.id,
                        result: [
                            [["mining.set_difficulty", "sub1"], ["mining.notify", "sub1"]],
                            "08000002", // ExtraNonce1
                            4 // ExtraNonce2 Size
                        ],
                        error: null
                    };
                    subscriptionId = "sub1";
                }
                else if (msg.method === 'mining.authorize') {
                    authorized = true;
                    response = {
                        id: msg.id,
                        result: true,
                        error: null
                    };
                }
                else if (msg.method === 'mining.submit') {
                    console.log('Share submitted!');
                    response = {
                        id: msg.id,
                        result: true,
                        error: null
                    };
                }

                if (response) {
                    const respStr = JSON.stringify(response) + '\n';
                    socket.write(respStr);
                    console.log('SENT:', respStr.trim());
                }

                // If authorized, send job immediately (and set difficulty)
                if (msg.method === 'mining.authorize') {
                    // Set Difficulty
                    const diffMsg = JSON.stringify({
                        method: "mining.set_difficulty",
                        params: [1]
                    }) + '\n';
                    socket.write(diffMsg);

                    // Send Job
                    const jobMsg = JSON.stringify({
                        method: "mining.notify",
                        params: MOCK_JOB
                    }) + '\n';
                    socket.write(jobMsg);
                    console.log('SENT JOB');
                }

            } catch (e) {
                console.error('Error parsing JSON:', e);
            }
        }
    });

    socket.on('end', () => {
        console.log('Client disconnected');
    });

    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
});

server.listen(PORT, () => {
    console.log(`Mock Pool listening on port ${PORT}`);
});
