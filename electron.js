const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { spawn, fork } = require('child_process');

const store = new Store();
let mainWindow;
let miningProcess = null; // CLI Fallback
let minerWorker = null; // Node Worker for Addon
let miningStats = {
    hashrate: 0,
    shares: { accepted: 0, rejected: 0 },
    uptime: 0,
    connected: false,
    startTime: null
};

// Mining binary (fallback)
const MINER_BINARY = path.join(__dirname, '..', 'kuzadesignminer');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'public/icon.png')
    });

    // Load app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
    }

    mainWindow.on('closed', () => {
        // Stop mining when window is closed
        stopMiningFunc();
        mainWindow = null;
    });
}

const stopMiningFunc = async () => {
    if (minerWorker) {
        minerWorker.send({ type: 'stop' });
        minerWorker.kill();
        minerWorker = null;
    }
    if (miningProcess) {
        miningProcess.kill();
        miningProcess = null;
    }
    miningStats.connected = false;
    miningStats.hashrate = 0;
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    stopMiningFunc();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers for mining control
ipcMain.handle('start-mining', async (event, config) => {
    await stopMiningFunc();

    const walletAddr = config?.wallet?.address || '';
    const poolUrl = config?.pool?.url || 'kuzadesign-explorer.online:5555';

    if (!walletAddr) {
        return { success: false, error: 'Wallet address is not set.' };
    }

    // Use Node Worker for Pool Mining (using the addon)
    try {
        const workerPath = path.join(__dirname, 'miner-worker.js');
        minerWorker = fork(workerPath, [], {
            stdio: ['inherit', 'inherit', 'inherit', 'ipc']
        });

        minerWorker.on('message', (msg) => {
            if (msg.type === 'stats') {
                if (msg.stats.hashrate > 0) {
                    console.log('Main: Received stats from worker, hashrate:', msg.stats.hashrate);
                }
                // Synchronize global miningStats with worker stats
                miningStats.hashrate = msg.stats.hashrate;
                miningStats.shares = msg.stats.shares;
                miningStats.connected = msg.stats.connected;
                if (mainWindow) mainWindow.webContents.send('mining-status', miningStats);
            } else if (msg.type === 'start-result') {
                console.log('Main: Worker start result:', msg.result);
                if (!msg.result.success) {
                    miningStats.connected = false;
                    if (mainWindow) mainWindow.webContents.send('mining-status', { connected: false, error: msg.result.error });
                }
            } else if (msg.type === 'error') {
                console.error('Worker error:', msg.error);
            }
        });

        // Clean URL before sending to worker (remove stratum+tcp:// or similar)
        let cleanConfig = JSON.parse(JSON.stringify(config));
        if (cleanConfig.pool && cleanConfig.pool.url) {
            cleanConfig.pool.url = cleanConfig.pool.url.replace(/^(stratum\+tcp:\/\/|stratum:\/\/|tcp:\/\/)/i, '');
        }

        minerWorker.send({ type: 'start', config: cleanConfig });
        miningStats.startTime = Date.now();
        return { success: true };
    } catch (error) {
        console.error('Failed to start worker, falling back to CLI:', error.message);
    }

    // 4. Fallback to Standalone Binary on Windows or if Worker fails
    try {
        const isWin = process.platform === 'win32';
        let STANDALONE_BINARY = isWin
            ? path.join(__dirname, 'kzd-miner.exe')
            : path.join(__dirname, '..', 'kuzadesignminer');

        if (isWin && !fs.existsSync(STANDALONE_BINARY)) {
            const unpackedPath = path.join(__dirname.replace('app.asar', 'app.asar.unpacked'), 'kzd-miner.exe');
            if (fs.existsSync(unpackedPath)) STANDALONE_BINARY = unpackedPath;
        }

        if (isWin) {
            console.log('Main: Starting standalone Windows miner...');
            const host = poolUrl.split(':')[0];
            const port = poolUrl.split(':')[1] || '5555';

            miningProcess = spawn(STANDALONE_BINARY, [
                '--host', host,
                '--port', port,
                '--user', walletAddr,
                '--threads', config?.mining?.threads || '2'
            ]);
        } else {
            const rpcServer = 'localhost:16110';
            miningProcess = spawn(STANDALONE_BINARY, [
                `--miningaddr=${walletAddr}`,
                `--rpcserver=${rpcServer}`
            ]);
        }

        miningStats.startTime = Date.now();
        miningStats.connected = isWin; // Assume connected if process starts on Windows (it handles its own conn)

        miningProcess.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (let line of lines) {
                if (!line.trim()) continue;

                if (line.includes('[STATS]')) {
                    // Format: [STATS]|hashrate|shares
                    const parts = line.split('|');
                    if (parts.length >= 3) {
                        miningStats.hashrate = parseFloat(parts[1]);
                        miningStats.shares.accepted = parseInt(parts[2]);
                        miningStats.connected = true;
                    }
                } else if (line.includes('Connected')) {
                    miningStats.connected = true;
                } else if (line.includes('Found block')) {
                    miningStats.shares.accepted += 1;
                }

                if (mainWindow) mainWindow.webContents.send('mining-status', miningStats);
            }
        });

        miningProcess.on('close', () => {
            miningProcess = null;
            miningStats.connected = false;
            miningStats.hashrate = 0;
            if (mainWindow) mainWindow.webContents.send('mining-status', { connected: false, stopped: true });
        });

        return { success: true, note: isWin ? 'Running standalone Windows miner' : 'Running in solo fallback mode' };
    } catch (error) {
        return { success: false, error: 'Failed to start miner: ' + error.message };
    }
});

ipcMain.handle('stop-mining', async () => {
    await stopMiningFunc();
    return { success: true };
});

const si = require('systeminformation');

ipcMain.handle('get-stats', async () => {
    const uptime = miningStats.startTime ? Math.floor((Date.now() - miningStats.startTime) / 1000) : 0;

    try {
        const [temp, load, mem] = await Promise.all([
            si.cpuTemperature(),
            si.currentLoad(),
            si.mem()
        ]);

        return {
            ...miningStats,
            uptime: uptime,
            cpuTemp: temp.main || 0,
            cpuUsage: load.currentLoad || 0,
            memUsed: mem.active,
            memTotal: mem.total
        };
    } catch (e) {
        return {
            ...miningStats,
            uptime: uptime,
            cpuTemp: 0, cpuUsage: 0, memUsed: 0, memTotal: 0
        };
    }
});

ipcMain.handle('get-config', () => {
    let currentConfig = store.get('config', {
        pool: {
            url: '144.91.66.97:5555',
            worker: 'linux-miner'
        },
        wallet: {
            address: ''
        },
        mining: {
            threads: 2,
            intensity: 0.75
        }
    });

    // Configuration Migration: Force update if using old Cloudflare-blocked URL to new VPS IP
    const oldUrls = ['kuzadesign-explorer.online:5555', 'pool.kuzadesign-explorer.online:5555'];
    if (currentConfig.pool && currentConfig.pool.url && oldUrls.some(old => currentConfig.pool.url.includes(old))) {
        console.log('Main: Migrating old Cloudflare pool URL to new VPS IP...');
        currentConfig.pool.url = '144.91.66.97:5555';
        store.set('config', currentConfig);
    }

    return currentConfig;
});

ipcMain.handle('save-config', (event, config) => {
    store.set('config', config);
    return { success: true };
});
