#!/bin/bash
# Script to build the Windows MCP executable

# Clear previous bundle
rm -rf dist-bundle
mkdir -p dist-bundle

# Bundle to CJS
node scripts/bundle-mcp.js

# Check if pkg is installed, otherwise install it
if ! npx pkg --version > /dev/null 2>&1; then
    echo "Installing pkg..."
    npm install -g pkg
fi

# Build for Windows using pkg
# Explicitly use node18-win-x64 as target
npx pkg dist-bundle/package.json --target node18-win-x64 --output dist-binaries/innosynth-mcp-win.exe

echo "Build complete: dist-binaries/innosynth-mcp-win.exe"
