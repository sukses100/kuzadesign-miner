#include <iostream>
#include <vector>
#include <iomanip>
#include "hash.h"

int main() {
    std::cout << "Testing Blake3 Hash..." << std::endl;
    
    // Test vector: "hello world"
    std::string input_str = "hello world";
    std::vector<uint8_t> data(input_str.begin(), input_str.end());
    uint64_t nonce = 0;
    
    std::vector<uint8_t> hash = kuzadesign::calculateHash(data, nonce);
    
    std::cout << "Hash: " << kuzadesign::hashToHex(hash) << std::endl;
    
    // Verify length
    if (hash.size() != 32) {
        std::cerr << "Error: Invalid hash length!" << std::endl;
        return 1;
    }
    
    std::cout << "Test passed!" << std::endl;
    return 0;
}
