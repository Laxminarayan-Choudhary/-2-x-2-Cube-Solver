#!/bin/bash
set -e

# Change directory to the wasm folder
cd "$(dirname "$0")"

# Create the output directory if it doesn't exist
mkdir -p ../src/wasm

echo "Compiling solver.cpp to WebAssembly..."

# Compile with optimization and single-file bundling
emcc -O3 -std=c++17 \
  -s WASM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s SINGLE_FILE=1 \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -s EXPORT_ES6=1 \
  -s MODULARIZE=1 \
  -o ../src/wasm/solver.js \
  solver.cpp

echo "WebAssembly compilation successful!"
