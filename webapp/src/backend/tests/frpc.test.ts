import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateFrpcConfig } from '../utils/frpc.js';
import os from 'os';

// Mock os
vi.mock('os', () => ({
    default: {
        tmpdir: vi.fn(),
        platform: vi.fn(),
    },
}));

describe('FRPC Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (os.tmpdir as any).mockReturnValue('/tmp');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('generateFrpcConfig', () => {
        it('generates correct config path', () => {
            const { configPath } = generateFrpcConfig('test123', 3000);

            expect(configPath).toBe('/tmp/frpc-test123.ini');
        });

        it('generates correct config content', () => {
            const { configContent } = generateFrpcConfig('test123', 3000);

            expect(configContent).toContain('[common]');
            expect(configContent).toContain('server_addr = 172.174.244.221');
            expect(configContent).toContain('server_port = 7000');
            expect(configContent).toContain('token = 48f8ef8d08aa5c4d9adab6b3b7f7b9df');
            expect(configContent).toContain('[test123]');
            expect(configContent).toContain('type = http');
            expect(configContent).toContain('local_ip = 127.0.0.1');
            expect(configContent).toContain('local_port = 3000');
            expect(configContent).toContain('custom_domains = test123.mcp.innosynth.ai');
        });

        it('uses custom port in config', () => {
            const { configContent } = generateFrpcConfig('test123', 8080);

            expect(configContent).toContain('local_port = 8080');
        });

        it('uses custom subdomain in config', () => {
            const { configContent } = generateFrpcConfig('custom-sub', 3000);

            expect(configContent).toContain('[custom-sub]');
            expect(configContent).toContain('custom_domains = custom-sub.mcp.innosynth.ai');
        });
    });
});
