# Innosynth MCP WebApp

A modern web UI for managing the Innosynth MCP Server with FRP tunneling capabilities.

## Features

- **Modern UI**: Beautiful glassmorphism design with Tailwind CSS
- **One-Click Start**: Start MCP server and FRP tunnel with a single button
- **Provider Selection**: Choose between InnoSynth, Google Gemini, or OpenAI
- **Auto-Generated Tunnel URL**: Unique subdomain ending with `/mcp`
- **Real-time Status**: Live status updates for MCP server and FRP tunnel

## Prerequisites

- Node.js 18+
- npm or pnpm
- FRPC binary in the `bin/` directory

## Installation

```bash
cd webapp
npm install
```

## Development

Run both backend and frontend in development mode:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

## Production Build

```bash
npm run build
npm start
```

## Environment Variables

Create a `.env` file in the webapp directory:

```env
# vLLM Configuration (default provider)
VLLM_BASE_URL=http://localhost:8000/v1
VLLM_API_KEY=your-vllm-api-key
VLLM_MODEL_NAME=qwen3-max

# Optional: Other providers
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Get current server and tunnel status |
| POST | `/api/start` | Start MCP server and FRP tunnel |
| POST | `/api/stop` | Stop MCP server and FRP tunnel |
| POST | `/api/provider` | Update AI provider configuration |
| GET | `/api/providers` | List available AI providers |
| GET | `/api/subdomain` | Get machine-specific subdomain |
| GET | `/api/health` | Health check endpoint |

## FRP Configuration

The FRP tunnel automatically generates a unique subdomain based on your machine ID. The tunnel URL will be:

```
https://{subdomain}.mcp.innosynth.ai/mcp
```

## License

Apache-2.0
