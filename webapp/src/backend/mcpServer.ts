import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface McpServerState {
    isRunning: boolean;
    port: number;
    process: ChildProcess | null;
    error: string | null;
}

export interface ProviderConfig {
    type: 'vllm' | 'gemini' | 'openai';
    apiKey?: string;
    baseUrl?: string;
    modelName?: string;
}

// Default vLLM configuration (hidden from UI)
const DEFAULT_VLLM_CONFIG = {
    baseUrl: process.env.VLLM_BASE_URL || 'http://localhost:8000/v1',
    apiKey: process.env.VLLM_API_KEY || 'sk-default-vllm-key',
    modelName: process.env.VLLM_MODEL_NAME || 'qwen3-max',
};

class McpServerManager {
    private state: McpServerState = {
        isRunning: false,
        port: 3000,
        process: null,
        error: null,
    };

    private providerConfig: ProviderConfig = {
        type: 'vllm',
        ...DEFAULT_VLLM_CONFIG,
    };

    getState(): McpServerState {
        return { ...this.state };
    }

    getProviderConfig(): ProviderConfig {
        return { ...this.providerConfig };
    }

    setProviderConfig(config: Partial<ProviderConfig>): void {
        this.providerConfig = { ...this.providerConfig, ...config };
    }

    async start(): Promise<{ success: boolean; error?: string; port?: number }> {
        if (this.state.isRunning) {
            return { success: false, error: 'MCP server is already running' };
        }

        try {
            console.log('[MCP Server] Starting MCP server...');
            console.log('[MCP Server] Provider:', this.providerConfig.type);

            // Find the innosynth-mcp binary or use npm
            const mcpPath = this.findMcpBinary();
            const args: string[] = [];

            // Set environment variables for the MCP server
            const env = { ...process.env };
            env.STAGEHAND_ENV = 'LOCAL';
            env.MODEL_NAME = this.providerConfig.modelName || DEFAULT_VLLM_CONFIG.modelName;

            if (this.providerConfig.type === 'vllm') {
                env.MODEL_BASE_URL = this.providerConfig.baseUrl || DEFAULT_VLLM_CONFIG.baseUrl;
                env.OPENAI_API_KEY = this.providerConfig.apiKey || DEFAULT_VLLM_CONFIG.apiKey;
            } else if (this.providerConfig.type === 'gemini') {
                env.GEMINI_API_KEY = this.providerConfig.apiKey || '';
            } else if (this.providerConfig.type === 'openai') {
                env.OPENAI_API_KEY = this.providerConfig.apiKey || '';
                if (this.providerConfig.baseUrl) {
                    env.MODEL_BASE_URL = this.providerConfig.baseUrl;
                }
            }

            if (mcpPath) {
                // Use the binary directly
                this.state.process = spawn('node', [mcpPath], {
                    env,
                    stdio: 'pipe',
                });
            } else {
                // Fallback to using node with the source
                const sourcePath = path.join(__dirname, '..', '..', '..', 'dist', 'index.js');
                this.state.process = spawn('node', [sourcePath], {
                    env,
                    stdio: 'pipe',
                });
            }

            // Handle process output
            this.state.process.stdout?.on('data', (data) => {
                console.log(`[MCP STDOUT] ${data.toString().trim()}`);
            });

            this.state.process.stderr?.on('data', (data) => {
                const output = data.toString().trim();
                console.log(`[MCP STDERR] ${output}`);
                if (output.includes('Error') || output.includes('error')) {
                    this.state.error = output;
                }
            });

            this.state.process.on('close', (code) => {
                console.log(`[MCP Server] Process closed with code ${code}`);
                this.state.isRunning = false;
                this.state.process = null;
            });

            this.state.process.on('error', (err) => {
                console.error(`[MCP Server] Error: ${err.message}`);
                this.state.error = err.message;
                this.state.isRunning = false;
            });

            // Wait a bit for the server to start
            await new Promise(resolve => setTimeout(resolve, 2000));

            this.state.isRunning = true;
            console.log(`[MCP Server] Started on port ${this.state.port}`);

            return { success: true, port: this.state.port };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.state.error = errorMsg;
            console.error('[MCP Server] Failed to start:', errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    async stop(): Promise<{ success: boolean; error?: string }> {
        if (!this.state.isRunning || !this.state.process) {
            return { success: false, error: 'MCP server is not running' };
        }

        try {
            console.log('[MCP Server] Stopping MCP server...');
            this.state.process.kill('SIGTERM');

            // Wait for graceful shutdown
            await new Promise(resolve => setTimeout(resolve, 2000));

            this.state.isRunning = false;
            this.state.process = null;
            console.log('[MCP Server] Stopped');

            return { success: true };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('[MCP Server] Failed to stop:', errorMsg);
            return { success: false, error: errorMsg };
        }
    }

    private findMcpBinary(): string | null {
        const possiblePaths = [
            path.join(__dirname, '..', '..', '..', 'cli.js'),
            path.join(__dirname, '..', '..', '..', 'dist', 'index.js'),
            path.join(process.cwd(), 'cli.js'),
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }

        return null;
    }
}

export const mcpServerManager = new McpServerManager();
