#!/bin/bash

# MCP Server Startup Script
# This script kills all running processes and starts fresh

echo "=== MCP Server Startup Script ==="
echo ""

# Kill all running processes
echo "Killing existing processes..."
pkill -f "node.*dist/program.js" 2>/dev/null
pkill -f "frpc" 2>/dev/null
pkill -f "stagehand" 2>/dev/null
sleep 2

# Verify processes are killed
if pgrep -f "node.*dist/program.js" > /dev/null; then
    echo "Warning: MCP server process still running"
fi

if pgrep -f "frpc" > /dev/null; then
    echo "Warning: FRPC process still running"
fi

echo ""
echo "Starting MCP server..."

# Change to the project directory
cd /home/desktopuser/Downloads/stagehand-mcp-offline

# Start the MCP server
STAGEHAND_ENV=LOCAL \
HEADLESS=false \
MODEL_NAME=openai/qwen3-max \
MODEL_BASE_URL=http://172.174.244.221:8001/v1 \
OPENAI_API_KEY=any-key \
node dist/program.js --experimental --port 3000 --host 0.0.0.0 &

MCP_PID=$!
echo "MCP server started with PID: $MCP_PID"

# Wait for server to start
sleep 3

echo ""
echo "Starting FRPC tunnel..."

# Start FRPC tunnel
/home/desktopuser/.config/chrome-mcp-app/bin/frpc -c /home/desktopuser/Desktop/frpc-mcp.ini &

FRPC_PID=$!
echo "FRPC started with PID: $FRPC_PID"

echo ""
echo "=== Server Started Successfully ==="
echo "MCP Server PID: $MCP_PID"
echo "FRPC PID: $FRPC_PID"
echo ""
echo "Access URL: http://mcp-test.innosynth.org/mcp"
echo ""
echo "To stop the server, run:"
echo "  kill $MCP_PID $FRPC_PID"
echo "  or use: pkill -f 'node.*dist/program.js' && pkill -f 'frpc'"
