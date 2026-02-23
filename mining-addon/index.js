const miningAddon = require('./build/Release/mining_addon.node');

module.exports = {
    start: (config) => {
        return new Promise((resolve, reject) => {
            try {
                const result = miningAddon.start(config);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    },

    stop: () => {
        return new Promise((resolve, reject) => {
            try {
                const result = miningAddon.stop();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    },

    getStats: () => {
        return new Promise((resolve, reject) => {
            try {
                const stats = miningAddon.getStats();
                resolve(stats);
            } catch (error) {
                reject(error);
            }
        });
    },

    on: (event, callback) => {
        // TODO: Implement event emitters
        console.log('Event listener:', event);
    }
};
