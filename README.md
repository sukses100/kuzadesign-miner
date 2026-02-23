# Kuzadesign Desktop Miner

Desktop mining application for Kuzadesign cryptocurrency with cross-platform support (Windows, Linux, macOS).

## Features

- ⚡ High-performance mining (500 MH/s - 2 GH/s on mid-range CPU)
- 🖥️ Beautiful Electron UI with real-time statistics
- 🎛️ Adjustable thread count and mining intensity
- 📊 Live hashrate and share tracking
- 🔗 Stratum pool protocol support
- 🌡️ CPU temperature monitoring
- ⚙️ Multi-threaded C++ mining core

## Development Status

🚧 **WORK IN PROGRESS** 🚧

Current phase: **Initial Scaffolding Complete**

### Completed:
- ✅ Project structure
- ✅ Electron + React UI (Dashboard, Settings, Statistics)
- ✅ C++ mining core structure
- ✅ Node.js N-API addon bridge
- ✅ Build configuration files

### TODO:
- ⏳ Implement actual Kuzadesign hash algorithm (Blake3)
- ⏳ Complete Stratum client
- ⏳ Add real pool connection
- ⏳ Statistics charts
- ⏳ Cross-platform builds

## Prerequisites

- Node.js 18+
- Python 3.x (for node-gyp)
- CMake 3.10+
- C++ compiler (GC C++/Clang/MSVC)

### Windows
```bash
npm install --global windows-build-tools
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install build-essential cmake
```

### macOS
```bash
xcode-select --install
brew install cmake
```

## Installation

```bash
# Clone repository
cd kuzadesign-miner

# Install dependencies
npm install

# Build C++ mining core
cd mining-core
mkdir build && cd build
cmake ..
make
cd ../..

# Build Node.js addon
npm run build:addon
```

## Usage

### Development Mode
```bash
# Start Electron in development mode
npm run electron:dev
```

### Production Build
```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:win      # Windows
npm run build:linux    # Linux
npm run build:mac      # macOS
```

## Configuration

Settings are stored in Electron's app data directory:
- **Windows**: `%APPDATA%/kuzadesign-miner`
- **Linux**: `~/.config/kuzadesign-miner`
- **macOS**: `~/Library/Application Support/kuzadesign-miner`

## Project Structure

```
kuzadesign-miner/
├── mining-core/          # C++ mining engine
│   ├── src/             # Core implementation
│   ├── include/         # Header files
│   └── test/            # Unit tests
├── mining-addon/         # Node.js N-API bridge
├── src/                  # React UI components
├── public/               # Static assets
└── electron.js          # Electron main process
```

## Contributing

This is currently in active development. Contributions welcome!

## License

MIT License

## Support

Pool Dashboard: https://kuzadesign-explorer.online/pools/

## Public Mining Connection

To mine on the public pool, use the following settings:
- **Pool URL:** `144.91.66.97:5555`
- **Wallet Address:** Your Kuzadesign address (e.g., `kuzadesign:qztc84...`)

> [!IMPORTANT]
> Do not use the main domain `kuzadesign-explorer.online:5555` directly as it is protected by Cloudflare and will block mining traffic. Always use the `pool.` subdomain.
