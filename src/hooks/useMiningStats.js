import { useState, useEffect } from 'react';

let ipcRenderer;
try {
    const electron = window.require ? window.require('electron') : require('electron');
    ipcRenderer = electron.ipcRenderer;
} catch (e) {
    console.error('Failed to load electron in useMiningStats:', e);
}

export default function useMiningStats(isActive) {
    const [stats, setStats] = useState({
        hashrate: 0,
        shares: { accepted: 0, rejected: 0 },
        uptime: 0,
        connected: false,
        cpuTemp: 0,
        cpuUsage: 0,
        memUsed: 0,
        memTotal: 0,
        history: []
    });

    useEffect(() => {
        if (!isActive) {
            setStats(prev => ({ ...prev, connected: false }));
            return;
        }

        const interval = setInterval(async () => {
            const newStats = await ipcRenderer.invoke('get-stats');

            setStats(prev => {
                const now = new Date().toLocaleTimeString();
                const newHistory = [...prev.history, { time: now, hashrate: newStats.hashrate }];
                if (newHistory.length > 60) newHistory.shift(); // Keep last 60 seconds

                return {
                    ...newStats,
                    history: newHistory
                };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive]);

    return stats;
}
