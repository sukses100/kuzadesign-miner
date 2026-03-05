const net = require('net');
const tls = require('tls');

class StratumClient {
    constructor(host, port, wallet, workerName = 'generic') {
        this.host = host;
        this.port = port;
        this.wallet = wallet;
        this.workerName = workerName;
        this.socket = null;
        this.connected = false;
        this.onJobCallback = null;
        this.onStatsCallback = null;
        this.requestId = 1;
        this.reconnectTimeout = null;
        // SSL only when user explicitly passes 'stratum+ssl://' prefix — NOT based on port number
        // Port 5555 is plain TCP for our pool (not SSL)
        this.isSSL = false; // Set to true only for SSL pools (stratum+ssl://)
    }

    connect() {
        if (this.socket) this.socket.destroy();

        console.log(`JS-Stratum: Connecting to ${this.host}:${this.port} (SSL: ${this.isSSL})...`);

        if (this.isSSL) {
            this.socket = tls.connect(this.port, this.host, {
                rejectUnauthorized: false
            }, () => {
                this.onConnect();
            });
        } else {
            this.socket = new net.Socket();
            this.socket.connect(this.port, this.host, () => {
                this.onConnect();
            });
        }

        this.socket.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (let line of lines) {
                if (line.trim()) {
                    this.handleMessage(line);
                }
            }
        });

        this.socket.on('close', () => {
            console.log('JS-Stratum: Connection closed');
            this.connected = false;
            this.scheduleReconnect();
        });

        this.socket.on('error', (err) => {
            console.error('JS-Stratum Error:', err.message);
            this.connected = false;
        });
    }

    onConnect() {
        console.log('JS-Stratum: Connected to pool!');
        this.connected = true;
        this.subscribe();
        this.authorize();
    }

    scheduleReconnect() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connect(), 5 * 1000);
    }

    send(method, params = []) {
        if (!this.connected) return;
        const msg = JSON.stringify({
            jsonrpc: "2.0",
            id: this.requestId++,
            method: method,
            params: params
        }) + '\n';
        this.socket.write(msg);
        console.log(`JS-Stratum: Sent ${method} (ID: ${this.requestId - 1})`);
    }

    subscribe() {
        this.send('mining.subscribe', ['kzd-miner-js/1.0']);
    }

    authorize() {
        this.send('mining.authorize', [this.wallet, 'x']);
    }

    submit(jobId, nonce, extraNonce2, ntime) {
        const nonceHex = nonce.toString(16).padStart(16, '0');
        this.send('mining.submit', [this.workerName, jobId, nonceHex]);
    }

    handleMessage(line) {
        try {
            const msg = JSON.parse(line);

            if (msg.method === 'mining.notify') {
                const [jobId, headerHash, timestamp, cleanJobs] = msg.params;
                if (this.onJobCallback) {
                    this.onJobCallback({
                        jobId,
                        header: headerHash,
                        timestamp: parseInt(timestamp),
                        cleanJobs: !!cleanJobs
                    });
                }
            } else if (msg.result === true) {
                console.log('JS-Stratum: Action/Login successful!');
                if (this.onStatsCallback) this.onStatsCallback('accepted');
            } else if (msg.result === false || msg.error) {
                console.log('JS-Stratum: Pool rejected request:', msg.error);
                if (this.onStatsCallback) this.onStatsCallback('rejected');
            }
        } catch (e) {
            console.error('JS-Stratum: Parse error:', e.message);
        }
    }

    onJob(cb) { this.onJobCallback = cb; }
    onStats(cb) { this.onStatsCallback = cb; }

    disconnect() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        if (this.socket) this.socket.destroy();
        this.connected = false;
    }

    isConnected() { return this.connected; }
}

module.exports = StratumClient;
