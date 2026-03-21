import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the modules
vi.mock('../mcpServer.js', () => ({
    mcpServerManager: {
        getState: vi.fn(),
        getProviderConfig: vi.fn(),
        setProviderConfig: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
    },
}));

vi.mock('../utils/frpc.js', () => ({
    startFrpcTunnel: vi.fn(),
    stopFrpcTunnel: vi.fn(),
}));

vi.mock('../utils/machineId.js', () => ({
    generateSubdomain: vi.fn(),
}));

describe('API Endpoints', () => {
    let app: express.Express;
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        vi.clearAllMocks();
        originalEnv = { ...process.env };
        process.env.NODE_ENV = 'test';

        // Default mock implementations
        (require('../mcpServer.js').mcpServerManager.getState as any).mockReturnValue({
            isRunning: false,
            port: 3000,
            process: null,
            error: null,
        });

        (require('../mcpServer.js').mcpServerManager.getProviderConfig as any).mockReturnValue({
            type: 'vllm',
            modelName: 'qwen3-max',
        });

        (require('../utils/machineId.js').generateSubdomain as any).mockReturnValue('test123');

        // Create a minimal app for testing
        app = express();
        app.use(express.json());

        // Health endpoint
        app.get('/api/health', (req: any, res: any) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    describe('GET /api/health', () => {
        it('returns health status', async () => {
            const response = await request(app).get('/api/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
            expect(response.body.timestamp).toBeDefined();
        });
    });
});
