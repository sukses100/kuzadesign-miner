import React, { useState } from 'react';

export default function Settings({ config, onSave }) {
    const [formData, setFormData] = useState(config);
    const [saved, setSaved] = useState(false);

    const handleChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
        setSaved(false);
    };

    const handleSave = () => {
        onSave(formData);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const cpuCores = navigator.hardwareConcurrency || 4;

    return (
        <div className="settings">
            <h2>Mining Settings</h2>

            <div className="settings-section">
                <h3>Pool Configuration</h3>
                <div className="form-group">
                    <label>Pool URL:</label>
                    <input
                        type="text"
                        value={formData.pool.url}
                        onChange={(e) => handleChange('pool', 'url', e.target.value)}
                        placeholder="pool.example.com:5555"
                    />
                </div>
                <div className="form-group">
                    <label>Worker Name:</label>
                    <input
                        type="text"
                        value={formData.pool.worker}
                        onChange={(e) => handleChange('pool', 'worker', e.target.value)}
                        placeholder="worker1"
                    />
                </div>
            </div>

            <div className="settings-section">
                <h3>Wallet</h3>
                <div className="form-group">
                    <label>Wallet Address:</label>
                    <input
                        type="text"
                        value={formData.wallet.address}
                        onChange={(e) => handleChange('wallet', 'address', e.target.value)}
                        placeholder="kuzadesign:qr..."
                    />
                </div>
            </div>

            <div className="settings-section">
                <h3>Mining Performance</h3>
                <div className="form-group">
                    <label>
                        CPU Threads: {formData.mining.threads} / {cpuCores}
                    </label>
                    <input
                        type="range"
                        min="1"
                        max={cpuCores}
                        value={formData.mining.threads}
                        onChange={(e) => handleChange('mining', 'threads', parseInt(e.target.value))}
                    />
                    <small>More threads = higher hashrate but less CPU for other tasks</small>
                </div>
                <div className="form-group">
                    <label>
                        Mining Intensity: {(formData.mining.intensity * 100).toFixed(0)}%
                    </label>
                    <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={formData.mining.intensity}
                        onChange={(e) => handleChange('mining', 'intensity', parseFloat(e.target.value))}
                    />
                    <small>Higher intensity = more CPU usage</small>
                </div>
            </div>

            <div className="settings-actions">
                <button className="btn btn-primary" onClick={handleSave}>
                    💾 Save Settings
                </button>
                {saved && <span className="save-indicator">✅ Saved!</span>}
            </div>
        </div>
    );
}
