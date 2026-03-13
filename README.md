# Innosynth MCP Server - Local Mode

[![npm version](https://badge.fury.io/js/innosynth-mcp.svg)](https://www.npmjs.com/package/innosynth-mcp)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Run [Stagehand](https://github.com/browserbase/stagehand) browser automation locally without cloud services. A fork of the official [@browserbasehq/mcp-server-browserbase](https://github.com/browserbase/mcp-server-browserbase) with LOCAL mode support and custom OpenAI endpoint configuration.

## Why This Fork?

The official Browserbase MCP server **only supports cloud mode**, requiring a paid Browserbase subscription. However, Stagehand itself fully supports local browser execution.

This fork unlocks that capability:

| Feature | Official Version | This Fork |
|---------|-----------------|-----------|
| Browser execution | Browserbase Cloud only | **Local Headless Chrome** |
| Required credentials | `BROWSERBASE_API_KEY` + `PROJECT_ID` | Only LLM API key |
| Cost | Browserbase subscription | **Free** (bring your own LLM key) |
| Network requirement | Internet required | Works offline/intranet |
| Auto screenshots | ❌ | ✅ After each action |
| Custom LLM endpoints | ❌ | ✅ Ollama, LM Studio, etc. |
| CDP connection | ❌ | ✅ Connect to existing Chrome |

## Use Cases

- **Local development** - Test browser automation without cloud costs
- **Self-hosted AI agents** - Run on your own servers
- **Air-gapped environments** - No external cloud dependency
- **CI/CD pipelines** - Automated testing without cloud API limits
- **Custom LLMs** - Use self-hosted models like Ollama or LM Studio

## Quick Start

### Starting the Server

The MCP server can be started in several ways:

#### Using npx (Recommended)

```bash
npx innosynth-mcp
```

#### Using npm (Global Installation)

```bash
# Install globally
npm install -g innosynth-mcp

# Start the server
innosynth-mcp
```

#### From Source (Development)

```bash
# Clone and build
git clone https://github.com/innosynth/innosynth-mcp.git
cd innosynth-mcp
pnpm install
pnpm build

# Start the server
node dist/program.js --port 3001
```

#### With Custom Model Endpoint

```bash
export NVM_DIR="/home/desktopuser/.nvm" && . "$NVM_DIR/nvm.sh" && \
STAGEHAND_ENV=LOCAL \
HEADLESS=false \
MODEL_NAME=openai/qwen3-max \
MODEL_BASE_URL=http://localhost:8001/v1 \
OPENAI_API_KEY=test \
node stagehand-mcp-offline/dist/program.js --port 3001 --experimental
```

#### In Background (Production)

```bash
export NVM_DIR="/home/desktopuser/.nvm" && . "$NVM_DIR/nvm.sh" && \
STAGEHAND_ENV=LOCAL \
HEADLESS=false \
MODEL_NAME=openai/qwen3-max \
MODEL_BASE_URL=http://localhost:8001/v1 \
OPENAI_API_KEY=test \
node /home/desktopuser/Downloads/stagehand-mcp-offline/dist/program.js --port 3001 --experimental > /tmp/mcp.log 2>&1 &
```

### Add to Claude Code

```bash
claude mcp add stagehand-local \
  -e STAGEHAND_ENV=LOCAL \
  -e OPENAI_API_KEY=your_key \
  -- npx innosynth-mcp
```

### Add to Claude Code

```bash
claude mcp add stagehand-local \
  -e STAGEHAND_ENV=LOCAL \
  -e OPENAI_API_KEY=your_key \
  -- npx innosynth-mcp
```

### Add to Cursor / VS Code

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "stagehand-local": {
      "command": "npx",
      "args": ["innosynth-mcp"],
      "env": {
        "STAGEHAND_ENV": "LOCAL",
        "OPENAI_API_KEY": "your_openai_key"
      }
    }
  }
}
```

## Installation

### npm (Global)

```bash
npm install -g innosynth-mcp
```

### From Source

```bash
git clone https://github.com/innosynth/innosynth-mcp.git
cd innosynth-mcp
pnpm install
pnpm build
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `STAGEHAND_ENV` | Set to `LOCAL` for local mode | `BROWSERBASE` | **Yes** |
| `OPENAI_API_KEY` | OpenAI API key | - | One of these |
| `GEMINI_API_KEY` | Google Gemini API key | - | is required |
| `ANTHROPIC_API_KEY` | Anthropic API key | - | for Stagehand |
| `MODEL_BASE_URL` | Base URL for custom OpenAI-compatible endpoints (e.g., Ollama, LM Studio) | - | No |
| `HEADLESS` | Run browser headless | `true` | No |
| `SCREENSHOT_ENABLED` | Enable auto screenshots | `true` | No |
| `SCREENSHOT_DIR` | Screenshot save directory | `/tmp/stagehand-screenshots` | No |
| `CDP_ENDPOINT` | Chrome DevTools Protocol endpoint to connect to existing Chrome browser | - | No |

### CLI Options

All original Browserbase MCP server options are supported:

```bash
npx innosynth-mcp --browserWidth 1920 --browserHeight 1080 --experimental
```

| Flag | Description |
|------|-------------|
| `--browserWidth <width>` | Browser viewport width (default: 1024) |
| `--browserHeight <height>` | Browser viewport height (default: 768) |
| `--modelName <model>` | LLM model for Stagehand (default: gemini-2.0-flash) |
| `--experimental` | Enable experimental Stagehand features |

## Custom Model Endpoints

You can use self-hosted LLMs or OpenAI-compatible APIs by setting the `MODEL_BASE_URL` environment variable:

### Ollama Example

```bash
claude mcp add stagehand-local \
  -e STAGEHAND_ENV=LOCAL \
  -e MODEL_BASE_URL=http://localhost:11434/v1 \
  -e OPENAI_API_KEY=ollama \
  -e modelName=llama3.2 \
  -- npx innosynth-mcp
```

### LM Studio Example

```json
{
  "mcpServers": {
    "stagehand-local": {
      "command": "npx",
      "args": ["innosynth-mcp"],
      "env": {
        "STAGEHAND_ENV": "LOCAL",
        "MODEL_BASE_URL": "http://localhost:1234/v1",
        "OPENAI_API_KEY": "any-key",
        "modelName": "your-model-name"
      }
    }
  }
}
```

### Generic OpenAI-Compatible API

```bash
export STAGEHAND_ENV=LOCAL
export MODEL_BASE_URL=https://api.your-custom-llm.com/v1
export OPENAI_API_KEY=your_api_key
export modelName=gpt-4o-mini
npx innosynth-mcp
```

## CDP Connection Mode

You can connect to an **existing Chrome browser** via Chrome DevTools Protocol (CDP) instead of launching a new browser. This is useful when you want to control a manually opened Chrome browser or a browser managed by another tool.

### How to Enable CDP on Chrome

1. Open Chrome with remote debugging enabled:

   **Linux:**
   ```bash
   google-chrome --remote-debugging-port=9222
   ```

   **macOS:**
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
   ```

   **Windows:**
   ```bash
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
   ```

2. Note the CDP endpoint URL (typically `http://localhost:9222`)

3. Configure the MCP server with the `CDP_ENDPOINT` environment variable:

   ```bash
   export STAGEHAND_ENV=LOCAL
   export CDP_ENDPOINT=http://localhost:9222
   export GEMINI_API_KEY=your_api_key
   npx innosynth-mcp
   ```

### CDP in Claude Code

```bash
claude mcp add stagehand-local \
  -e STAGEHAND_ENV=LOCAL \
  -e CDP_ENDPOINT=http://localhost:9222 \
  -e GEMINI_API_KEY=your_key \
  -- npx innosynth-mcp
```

### CDP in Cursor / VS Code

```json
{
  "mcpServers": {
    "stagehand-local": {
      "command": "npx",
      "args": ["innosynth-mcp"],
      "env": {
        "STAGEHAND_ENV": "LOCAL",
        "CDP_ENDPOINT": "http://localhost:9222",
        "GEMINI_API_KEY": "your_gemini_key"
      }
    }
  }
}
```

### CDP Endpoint Format

The `CDP_ENDPOINT` should be the Chrome DevTools Protocol debugging URL:
- Format: `http://<host>:<port>`
- Default port: `9222`
- Examples:
  - `http://localhost:9222` - Local Chrome
  - `http://127.0.0.1:9222` - Local Chrome (IPv4)
  - `http://docker-host:9222` - Chrome in Docker container

### Notes

- When `CDP_ENDPOINT` is set, the MCP server will **connect** to the existing browser instead of launching a new one
- The Chrome browser must be started with `--remote-debugging-port` flag
- Multiple tabs/windows in the Chrome browser will be accessible
- The browser must remain running for the MCP server to function

## Available MCP Tools

Once connected, your AI assistant can use these tools:

| Tool | Description |
|------|-------------|
| `browserbase_session_create` | Create a new browser session |
| `browserbase_session_close` | Close the current session |
| `browserbase_stagehand_navigate` | Navigate to a URL |
| `browserbase_stagehand_act` | Perform actions (click, type, etc.) |
| `browserbase_stagehand_extract` | Extract data from page |
| `browserbase_stagehand_observe` | Find interactive elements |
| `browserbase_screenshot` | Take a screenshot |
| `browserbase_stagehand_agent` | Run autonomous agent task |

## Auto Screenshots

In LOCAL mode, screenshots are automatically captured after each action for debugging and visualization:

```
Action performed: Click the login button
[SCREENSHOT:/tmp/stagehand-screenshots/default/1702012345678.jpg]
```

Parse the screenshot path programmatically:

```javascript
const match = output.match(/\[SCREENSHOT:(.+?)\]/);
if (match) {
  const screenshotPath = match[1];
  // Use the screenshot...
}
```

## System Requirements

### macOS / Windows

Playwright will download Chromium automatically.

### Linux (Ubuntu/Debian)

```bash
# Install browser dependencies
apt-get update && apt-get install -y \
  chromium libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2 \
  libpango-1.0-0 libcairo2

# Install Playwright browsers
npx playwright install chromium
```

### Docker

```dockerfile
FROM node:20

RUN apt-get update && apt-get install -y \
  chromium libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2 \
  libpango-1.0-0 libcairo2 \
  && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install chromium

ENV STAGEHAND_ENV=LOCAL
```

## Switching Between Modes

You can switch back to Browserbase cloud mode anytime:

```json
{
  "env": {
    "STAGEHAND_ENV": "BROWSERBASE",
    "BROWSERBASE_API_KEY": "your_key",
    "BROWSERBASE_PROJECT_ID": "your_project_id",
    "GEMINI_API_KEY": "your_gemini_key"
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Credits

This project is a fork of [@browserbasehq/mcp-server-browserbase](https://github.com/browserbase/mcp-server-browserbase) by [Browserbase, Inc](https://www.browserbase.com/).

Built with:
- [Stagehand](https://github.com/browserbase/stagehand) - AI browser automation framework
- [Model Context Protocol](https://modelcontextprotocol.io/) - LLM integration standard
- [Playwright](https://playwright.dev/) - Browser automation

## License

Apache-2.0 - See [LICENSE](./LICENSE) for details.

**Original work**: Copyright 2025 Browserbase, Inc.
**Modifications**: Copyright 2025 innosynth
