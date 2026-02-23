#include <iostream>
#include <thread>
#include <chrono>
#include "../include/stratum.h"

int main(int argc, char* argv[]) {
    if (argc < 3) {
        std::cout << "Usage: ./test_stratum <host> <port>" << std::endl;
        return 1;
    }

    std::string host = argv[1];
    int port = std::atoi(argv[2]);

    kuzadesign::stratum::Client client;
    
    std::cout << "Connecting..." << std::endl;
    if (!client.connect(host, port)) {
        std::cerr << "Failed to connect!" << std::endl;
        return 1;
    }

    // Try to login (using arbitrary credentials for test)
    std::cout << "Logging in..." << std::endl;
    client.login("testuser", "x");

    // Loop for a few seconds to receive data
    for (int i = 0; i < 5; i++) {
        client.process();
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }

    client.disconnect();
    std::cout << "Done." << std::endl;
    return 0;
}
