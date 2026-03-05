import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import Statistics from './components/Statistics';
import useMiningStats from './hooks/useMiningStats';

let ipcRenderer;
try {
    const electron = window.require ? window.require('electron') : require('electron');
    ipcRenderer = electron.ipcRenderer;
} catch (e) {
    console.error('Failed to load electron in renderer:', e);
}

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [config, setConfig] = useState(null);
    const [isMining, setIsMining] = useState(false);
    const stats = useMiningStats(isMining);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        const cfg = await ipcRenderer.invoke('get-config');
        setConfig(cfg);
    };

    const handleStartMining = async () => {
        if (!config?.wallet?.address) {
            alert('Please set wallet address in Settings first!');
            setActiveTab('settings');
            return;
        }

        const result = await ipcRenderer.invoke('start-mining', config);
        if (result.success) {
            setIsMining(true);
        } else {
            alert('Failed to start mining: ' + result.error);
        }
    };

    const handleStopMining = async () => {
        const result = await ipcRenderer.invoke('stop-mining');
        if (result.success) {
            setIsMining(false);
        }
    };

    const handleSaveConfig = async (newConfig) => {
        await ipcRenderer.invoke('save-config', newConfig);
        setConfig(newConfig);
    };

    if (!config) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="app">
            <header className="app-header">
                <div className="header-left">
                    <h1>⛏️ Kuzadesign Miner</h1>
                    <span class="version">v1.1.0</span>
                    <span class="badge badge-ddns">DDNS Active</span>
                </div>
                <div className="header-right">
                    <div className={`status-badge ${isMining ? 'mining' : 'stopped'}`}>
                        {isMining ? '🟢 Mining' : '🔴 Stopped'}
                    </div>
                </div>
            </header>

            <nav className="tabs">
                <button
                    className={activeTab === 'dashboard' ? 'active' : ''}
                    onClick={() => setActiveTab('dashboard')}
                >
                    📊 Dashboard
                </button>
                <button
                    className={activeTab === 'statistics' ? 'active' : ''}
                    onClick={() => setActiveTab('statistics')}
                >
                    📈 Statistics
                </button>
                <button
                    className={activeTab === 'settings' ? 'active' : ''}
                    onClick={() => setActiveTab('settings')}
                >
                    ⚙️ Settings
                </button>
            </nav>

            <main className="content">
                {activeTab === 'dashboard' && (
                    <Dashboard
                        stats={stats}
                        isMining={isMining}
                        onStart={handleStartMining}
                        onStop={handleStopMining}
                        config={config}
                    />
                )}
                {activeTab === 'statistics' && (
                    <Statistics stats={stats} />
                )}
                {activeTab === 'settings' && (
                    <Settings
                        config={config}
                        onSave={handleSaveConfig}
                    />
                )}
            </main>

            <footer className="app-footer">
                <span>Pool: <span style={{ color: '#a855f7' }}>{config.pool.url}</span></span>
                <span>Wallet: {config.wallet.address || 'Not set'}</span>
            </footer>
        </div>
    );
}

export default App;
