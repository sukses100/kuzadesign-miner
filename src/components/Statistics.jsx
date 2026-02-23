import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

export default function Statistics({ stats }) {
    const history = stats.history || [];

    const hashrateData = {
        labels: history.map(h => h.time),
        datasets: [
            {
                label: 'Hashrate (H/s)',
                data: history.map(h => h.hashrate),
                borderColor: '#00D1FF',
                backgroundColor: 'rgba(0, 209, 255, 0.5)',
                tension: 0.4,
                pointRadius: 2
            }
        ]
    };

    const sharesData = {
        labels: ['Accepted', 'Rejected'],
        datasets: [
            {
                data: [stats.shares.accepted, stats.shares.rejected],
                backgroundColor: ['#4CAF50', '#F44336'],
                borderColor: ['#388E3C', '#D32F2F'],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#ccc' }
            },
            title: {
                display: true,
                text: 'Real-time Hashrate',
                color: '#ccc'
            },
        },
        scales: {
            y: {
                ticks: { color: '#888' },
                grid: { color: '#333' }
            },
            x: {
                ticks: { display: false }, // Hide timestamps to avoid clutter
                grid: { display: false }
            }
        }
    };

    return (
        <div className="statistics">
            <div className="charts-grid">
                <div className="chart-container main-chart">
                    <Line options={options} data={hashrateData} />
                </div>

                <div className="chart-container side-chart">
                    <h3>Shares Distribution</h3>
                    <div className="doughnut-wrapper">
                        <Doughnut data={sharesData} options={{ plugins: { legend: { position: 'bottom', labels: { color: '#ccc' } } } }} />
                    </div>
                </div>
            </div>

            <div className="stats-summary">
                <div className="stat-box">
                    <h4>Current Hashrate</h4>
                    <span className="value">{stats.hashrate.toFixed(1)} H/s</span>
                </div>
                <div className="stat-box">
                    <h4>Total Shares</h4>
                    <span className="value">{stats.shares.accepted + stats.shares.rejected}</span>
                </div>
                <div className="stat-box">
                    <h4>Accepted</h4>
                    <span className="value green">{stats.shares.accepted}</span>
                </div>
                <div className="stat-box">
                    <h4>Rejected</h4>
                    <span className="value red">{stats.shares.rejected}</span>
                </div>
            </div>

            <style>{`
                .charts-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 20px;
                    margin-bottom: 20px;
                }
                .chart-container {
                    background: rgba(0,0,0,0.2);
                    padding: 15px;
                    border-radius: 10px;
                }
                .doughnut-wrapper {
                    max-height: 200px;
                    display: flex;
                    justify-content: center;
                }
                .side-chart h3 {
                    margin-top: 0;
                    text-align: center;
                    font-size: 1rem;
                    color: #aaa;
                }
                .stats-summary {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                }
                .stat-box {
                    background: rgba(255,255,255,0.05);
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                }
                .stat-box h4 {
                    margin: 0 0 10px;
                    color: #888;
                    font-size: 0.9rem;
                }
                .stat-box .value {
                    font-size: 1.5rem;
                    font-weight: bold;
                }
                .green { color: #4CAF50; }
                .red { color: #F44336; }
            `}</style>
        </div>
    );
}
