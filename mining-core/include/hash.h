#ifndef KUZADESIGN_HASH_H
#define KUZADESIGN_HASH_H

#include <cstdint>
#include <vector>
#include <string>

namespace kuzadesign {

std::vector<uint8_t> hexToBytes(const std::string& hex);
std::vector<uint8_t> targetFromNBits(const std::string& nbitsHex);

/**
 * Calculate Kuzadesign block hash
 * 
 * @param data Block header data
 * @param nonce Nonce value to test
 * @return Hash result as 256-bit value
 */
std::vector<uint8_t> calculateHash(const std::vector<uint8_t>& data, uint64_t nonce);

/**
 * Check if hash meets difficulty target
 * 
 * @param hash Hash to check
 * @param target Difficulty target
 * @return true if hash < target
 */
bool checkDifficulty(const std::vector<uint8_t>& hash, const std::vector<uint8_t>& target);

/**
 * Convert hash to hex string
 */
std::string hashToHex(const std::vector<uint8_t>& hash);

} // namespace kuzadesign

#endif // KUZADESIGN_HASH_H
