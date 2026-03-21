import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { mcpServerManager, type ProviderConfig } from './mcpServer.js';
import { startFrpcTunnel, stopFrpcTunnel, type FrpcProcess } from './utils/frpc.js';
import { generateSubdomain } from './utils/machineId.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// State management
let frpcTunnel: FrpcProcess | null = null;

// Serve static files from React build in production
const distPath = path.join(__dirname, '..', 'dist-frontend');
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(distPath));
}

// API Routes

// Get MCP server status
app.get('/api/status', (req: Request, res: Response) => {
    const mcpState = mcpServerManager.getState();
    const providerConfig = mcpServerManager.getProviderConfig();

    res.json({
        mcp: {
            isRunning: mcpState.isRunning,
            port: mcpState.port,
            error: mcpState.error,
        },
        frp: {
            isRunning: frpcTunnel !== null,
            url: frpcTunnel?.url || null,
            subdomain: frpcTunnel?.config.subdomain || null,
        },
        provider: {
            type: providerConfig.type,
            modelName: providerConfig.modelName,
        },
    });
});

// Start MCP server and FRP tunnel
app.post('/api/start', async (req: Request, res: Response) => {
    try {
        // Start MCP server first
        const mcpResult = await mcpServerManager.start();

        if (!mcpResult.success) {
            return res.status(500).json({
                success: false,
                error: mcpResult.error || 'Failed to start MCP server'
            });
        }

        // Start FRP tunnel
        frpcTunnel = await startFrpcTunnel(mcpResult.port);

        if (!frpcTunnel) {
            // MCP server started but FRP failed, stop MCP
            await mcpServerManager.stop();
            return res.status(500).json({
                success: false,
                error: 'Failed to start FRP tunnel'
            });
        }

        res.json({
            success: true,
            mcpPort: mcpResult.port,
            tunnelUrl: frpcTunnel.url,
            subdomain: frpcTunnel.config.subdomain,
            message: 'MCP server and FRP tunnel started successfully',
        });
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[API] Start error:', errorMsg);
        res.status(500).json({ success: false, error: errorMsg });
    }
});

// Stop MCP server and FRP tunnel
app.post('/api/stop', async (req: Request, res: Response) => {
    try {
        // Stop FRP tunnel first
        if (frpcTunnel) {
            stopFrpcTunnel(frpcTunnel.process);
            frpcTunnel = null;
        }

        // Stop MCP server
        const result = await mcpServerManager.stop();

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error || 'Failed to stop MCP server'
            });
        }

        res.json({
            success: true,
            message: 'MCP server and FRP tunnel stopped successfully',
        });
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[API] Stop error:', errorMsg);
        res.status(500).json({ success: false, error: errorMsg });
    }
});

// Update provider configuration
app.post('/api/provider', (req: Request, res: Response) => {
    try {
        const { type, apiKey, baseUrl, modelName }: Partial<ProviderConfig> = req.body;

        mcpServerManager.setProviderConfig({
            type: type as 'vllm' | 'gemini' | 'openai',
            apiKey,
            baseUrl,
            modelName,
        });

        res.json({
            success: true,
            message: 'Provider configuration updated',
            config: mcpServerManager.getProviderConfig(),
        });
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[API] Provider update error:', errorMsg);
        res.status(500).json({ success: false, error: errorMsg });
    }
});

// Get available providers
app.get('/api/providers', (req: Request, res: Response) => {
    res.json({
        providers: [
            {
                id: 'vllm',
                name: 'InnoSynth',
                description: 'Local vLLM inference server',
                hidden: true, // Hidden from UI, used by default
            },
            {
                id: 'gemini',
                name: 'Google Gemini',
                description: 'Google Gemini API',
                requiresApiKey: true,
            },
            {
                id: 'openai',
                name: 'OpenAI',
                description: 'OpenAI API or compatible',
                requiresApiKey: true,
                supportsCustomUrl: true,
            },
        ],
        current: mcpServerManager.getProviderConfig().type,
    });
});

// Get machine subdomain
app.get('/api/subdomain', (req: Request, res: Response) => {
    res.json({
        subdomain: generateSubdomain(),
        fullUrl: `http://${generateSubdomain()}.innosynth.org/mcp`,
    });
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback route for SPA
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`[WebApp] Backend server running on http://localhost:${PORT}`);
    console.log(`[WebApp] API available at http://localhost:${PORT}/api`);
});
