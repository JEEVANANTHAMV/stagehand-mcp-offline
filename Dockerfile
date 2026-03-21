# Step 1: Builder stage
FROM node:22-bullseye AS builder

# Set pnpm version
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm

WORKDIR /app

# Copy lockfile and package.json first
COPY pnpm-lock.yaml package.json ./

# Install all dependencies (including devDependencies for building)
RUN pnpm install --no-frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the TypeScript code
RUN pnpm run build

# Step 2: Runner stage
# Using Playwright's Ubuntu Noble (24.04) base which includes browser runtimes
FROM mcr.microsoft.com/playwright:v1.50.1-noble AS runner

# Set production environment
ENV NODE_ENV=production
ENV STAGEHAND_ENV=LOCAL
ENV HEADLESS=false
ENV DISPLAY=:99
ENV SCREENSHOT_DIR=/app/screenshots

WORKDIR /app

# Install GUI stack (Xvfb, Fluxbox, X11VNC, noVNC)
RUN apt-get update && apt-get install -y \
    xvfb \
    fluxbox \
    x11vnc \
    novnc \
    websockify \
    dbus-x11 \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm in the runner stage
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm

# Copy package.json and lockfile
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./

# Install ONLY production dependencies
RUN pnpm install --prod --no-frozen-lockfile

# Copy the built files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/cli.js ./cli.js
COPY --from=builder /app/src ./src/

# Copy FRPC binary and set permissions
# Note: folder name depends on version in root
RUN mkdir -p /app/bin
COPY frp_0.54.0_linux_amd64/frpc /app/bin/frpc
RUN chmod +x /app/bin/frpc

# Copy the entrypoint script
COPY scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create screenshots directory
RUN mkdir -p /app/screenshots && chmod 777 /app/screenshots

# Metadata labels
LABEL io.modelcontextprotocol.server.name="innosynth-mcp"
LABEL description="InnoSynth MCP Server with GUI and FRP tunnel support"

# Expose ports: 
# 3000 (MCP HTTP), 5900 (VNC), 6080 (noVNC)
EXPOSE 3000 5900 6080

# Use the entrypoint script to launch total services
ENTRYPOINT ["/bin/bash", "/entrypoint.sh"]