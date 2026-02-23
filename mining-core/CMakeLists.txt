cmake_minimum_required(VERSION 3.10)
project(kuzadesign_miner_core)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Find required packages
find_package(Threads REQUIRED)

# Source files
set(SOURCES
    src/hash.cpp
    src/miner.cpp
    src/worker.cpp
    src/stratum/client.cpp
    src/stratum/protocol.cpp
    src/stratum/job.cpp
    src/blake3/blake3.c
    src/blake3/blake3_dispatch.c
    src/blake3/blake3_portable.c
    src/json/cJSON.c
)

# Include directories
include_directories(${PROJECT_SOURCE_DIR}/include ${PROJECT_SOURCE_DIR}/src/blake3 ${PROJECT_SOURCE_DIR}/src/json)

# Create library
add_library(mining_core STATIC ${SOURCES})

if(WIN32)
    target_link_libraries(mining_core Threads::Threads ws2_32 wsock32)
else()
    target_link_libraries(mining_core Threads::Threads)
endif()

# Test executables
add_executable(test_hash test/test_hash.cpp)
target_link_libraries(test_hash mining_core)

add_executable(test_stratum test/test_stratum.cpp)
target_link_libraries(test_stratum mining_core)

add_executable(test_miner test/test_miner.cpp)
target_link_libraries(test_miner mining_core)

# Standalone Miner
add_executable(kzd-miner src/standalone_miner.cpp)
target_link_libraries(kzd-miner mining_core)

if(WIN32)
    # Ensure Windows libs are linked for the executable too
    target_link_libraries(kzd-miner ws2_32 wsock32)
endif()
