#!/bin/bash
# Docker entrypoint script for WebApp and MCP Server (Headful Chrome)

# Set a default display if not set
export DISPLAY=${DISPLAY:-:99}
export RESOLUTION=${RESOLUTION:-1280x800x24}

echo "Starting Xvfb on ${DISPLAY} with resolution ${RESOLUTION}..."
Xvfb ${DISPLAY} -screen 0 ${RESOLUTION} -ac +extension RANDR &
XVFB_PID=$!

# Wait for Xvfb to start
sleep 2

echo "Starting Fluxbox window manager..."
fluxbox &
FLUXBOX_PID=$!

echo "Starting X11VNC on port 5900..."
x11vnc -display ${DISPLAY} -forever -shared -nopw -rfbport 5900 -bg &
VNC_PID=$!

# Start noVNC (usually on 6080)
if command -v websockify >/dev/null 2>&1 && [ -d "/usr/share/novnc" ]; then
    echo "Starting noVNC on port 6080..."
    websockify --web /usr/share/novnc 6080 localhost:5900 &
    NOVNC_PID=$!
fi

echo "--- Services Started ---"
echo "VNC: localhost:5900"
if [ ! -z "$NOVNC_PID" ]; then echo "noVNC (Browser): http://localhost:6080/vnc.html"; fi
echo "WebApp API: http://localhost:8080"
echo "------------------------"

# Now start the WebApp Backend (which then starts the MCP Server)
echo "Starting InnoSynth WebApp Backend..."
# The webapp backend is in /app/webapp/dist/backend/index.js
cd /app/webapp
NODE_ENV=production node dist/backend/index.js
APP_EXIT_CODE=$?

# Cleanup
echo "Server stopped. Cleaning up..."
kill $VNC_PID $FLUXBOX_PID $XVFB_PID 2>/dev/null
[ ! -z "$NOVNC_PID" ] && kill $NOVNC_PID 2>/dev/null

exit $APP_EXIT_CODE
