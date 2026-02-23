import React from 'react';

export default function Dashboard({ stats, isMining, onStart, onStop, config }) {
    const formatHashrate = (hr) => {
        if (hr >= 1000000000) return (hr / 1000000000).toFixed(2) + ' GH/s';
        if (hr >= 1000000) return (hr / 1000000).toFixed(2) + ' MH/s';
        if (hr >= 1000) return (hr / 1000).toFixed(2) + ' KH/s';
        return hr.toFixed(2) + ' H/s';
    };

    const formatUptime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}h ${minutes}m ${secs}s`;
    };

    const acceptRate = stats.shares.accepted + stats.shares.rejected > 0
        ? ((stats.shares.accepted / (stats.shares.accepted + stats.shares.rejected)) * 100).toFixed(1)
        : 100;

    return (
        <div className="dashboard">
            <div className="controls">
                {!isMining ? (
                    <button
                        className="btn btn-start"
                        onClick={onStart}
                        disabled={!config.wallet?.address}
                    >
                        ▶️ Start Mining
                    </button>
                ) : (
                    <button className="btn btn-stop" onClick={onStop}>
                        ⏸️ Stop Mining
                    </button>
                )}
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-label">Hashrate</div>
                    <div className="stat-value">{formatHashrate(stats.hashrate)}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-label">Accepted Shares</div>
                    <div className="stat-value">{stats.shares.accepted}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">❌</div>
                    <div className="stat-label">Rejected Shares</div>
                    <div className="stat-value">{stats.shares.rejected}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-label">Accept Rate</div>
                    <div className="stat-value">{acceptRate}%</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⏱️</div>
                    <div className="stat-label">Uptime</div>
                    <div className="stat-value">{formatUptime(stats.uptime)}</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🔗</div>
                    <div className="stat-label">Pool Connection</div>
                    <div className="stat-value">
                        {stats.connected ? '🟢 Connected' : '🔴 Disconnected'}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🌡️</div>
                    <div className="stat-label">CPU Temperature</div>
                    <div className="stat-value">{stats.cpuTemp}°C</div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">💻</div>
                    <div className="stat-label">CPU Usage</div>
                    <div className="stat-value">{stats.cpuUsage}%</div>
                </div>
            </div>

            {!config.wallet?.address && (
                <div className="warning-box">
                    ⚠️ Please set your wallet address in Settings before mining!
                </div>
            )}
        </div>
    );
}
