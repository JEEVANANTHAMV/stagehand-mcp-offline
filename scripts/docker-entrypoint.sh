#!/bin/bash
# Docker entrypoint script to start Xvfb, VNC, FRPC, and the MCP server

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

# Activate FRPC tunnel if binary exists
if [ -f "/app/bin/frpc" ]; then
    echo "Activating FRPC tunnel (Machine ID based domain)..."
    # Call the startFrpc function from the compiled JS
    # We use a small node script to avoid complexity in bash
    node -e "
        import { startFrpc, generateMachineId } from './dist/utils/frpc.js';
        console.log('Generating machine ID...');
        const mid = generateMachineId();
        console.log('Using machine ID: ' + mid);
        startFrpc(mid).catch(e => console.error('FRP failed:', e));
    " &
    FRP_PID=$!
fi

echo "--- Services Started ---"
echo "VNC: localhost:5900"
if [ ! -z "$NOVNC_PID" ]; then echo "noVNC (Browser): http://localhost:6080/vnc.html"; fi
if [ ! -z "$FRP_PID" ]; then echo "FRPC Tunnel: Starting background process..."; fi
echo "------------------------"

# Now start the Node.js application
echo "Starting InnoSynth MCP Server..."
# Pass all arguments from docker run
node cli.js "$@"
APP_EXIT_CODE=$?

# Cleanup
echo "Server stopped. Cleaning up..."
kill $VNC_PID $FLUXBOX_PID $XVFB_PID 2>/dev/null
[ ! -z "$NOVNC_PID" ] && kill $NOVNC_PID 2>/dev/null
[ ! -z "$FRP_PID" ] && kill $FRP_PID 2>/dev/null

exit $APP_EXIT_CODE
