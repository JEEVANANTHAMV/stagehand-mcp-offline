# Base image: Playwright's default image for Ubuntu Noble (24.04)
# It comes with all browsers and OS dependencies for Chrome/Chromium
FROM mcr.microsoft.com/playwright:v1.50.1-noble AS runner

# Set production environment
ENV NODE_ENV=production
ENV STAGEHAND_ENV=LOCAL
ENV HEADLESS=false
ENV DISPLAY=:99

WORKDIR /app

# Install GUI stack for headful mode (Xvfb, Fluxbox, X11VNC, noVNC)
RUN apt-get update && apt-get install -y \
    xvfb \
    fluxbox \
    x11vnc \
    novnc \
    websockify \
    dbus-x11 \
    && rm -rf /var/lib/apt/lists/*

# Copy root dependencies from when we prepared the webapp folder
# These are named mcp-* in the context but at the container root
COPY mcp-package.json /app/package.json
COPY mcp-lock.yaml /app/pnpm-lock.yaml
# Copy the MCP server built files (needed for backend/mcpServer.js detection)
COPY mcp-dist /app/dist
COPY mcp-cli.js /app/cli.js

# Install production dependencies for the MCP server core
RUN npm install -g pnpm && \
    pnpm install --prod --no-frozen-lockfile

# Copy the webapp folder contents (already contains frontend & backend built)
COPY . /app/webapp

# Install webapp production dependencies
# This creates /app/webapp/node_modules
WORKDIR /app/webapp
RUN rm -rf node_modules package-lock.json && \
    npm install --omit=dev

# Copy FRP binary from webapp to /app/bin (where index.js looks)
ARG TARGETARCH
RUN mkdir -p /app/bin && \
    if [ "$TARGETARCH" = "arm64" ]; then \
        cp /app/webapp/frp_0.54.0_linux_arm64/frpc /app/bin/frpc; \
    else \
        cp /app/webapp/frp_0.54.0_linux_amd64/frpc /app/bin/frpc; \
    fi && \
    chmod +x /app/bin/frpc

# Copy the entrypoint script into correct location and set permissions
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Ensure the browsers are available for playwright to use in headful mode
RUN npx playwright install chromium

# Metadata labels
LABEL io.modelcontextprotocol.server.name="innosynth-mcp-webapp"
LABEL description="InnoSynth MCP WebApp with GUI dashboard and headful Chrome"

# Expose ports: 
# 8080 (WebApp UI/API), 3000 (MCP Server), 5900 (VNC), 6080 (noVNC)
EXPOSE 8080 3000 5900 6080

# Use the entrypoint script to launch services
ENTRYPOINT ["/bin/bash", "/entrypoint.sh"]
