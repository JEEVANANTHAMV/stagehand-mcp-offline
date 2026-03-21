import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

// Mock fetch globally
global.fetch = vi.fn() as any;

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders header correctly', async () => {
        (global.fetch as any).mockImplementation((url: string) => {
            if (url.includes('/api/status')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        mcp: { isRunning: false, port: 3000, error: null },
                        frp: { isRunning: false, url: null, subdomain: null },
                        provider: { type: 'vllm', modelName: 'qwen3-max' },
                    }),
                });
            }
            if (url.includes('/api/providers')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        providers: [],
                        current: 'vllm',
                    }),
                });
            }
            return Promise.resolve({ json: () => Promise.resolve({}) });
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Innosynth MCP')).toBeInTheDocument();
        });
    });

    it('displays stopped status initially', async () => {
        (global.fetch as any).mockImplementation((url: string) => {
            if (url.includes('/api/status')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        mcp: { isRunning: false, port: 3000, error: null },
                        frp: { isRunning: false, url: null, subdomain: null },
                        provider: { type: 'vllm', modelName: 'qwen3-max' },
                    }),
                });
            }
            if (url.includes('/api/providers')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        providers: [],
                        current: 'vllm',
                    }),
                });
            }
            return Promise.resolve({ json: () => Promise.resolve({}) });
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Stopped')).toBeInTheDocument();
        });
    });

    it('shows start button when not running', async () => {
        (global.fetch as any).mockImplementation((url: string) => {
            if (url.includes('/api/status')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        mcp: { isRunning: false, port: 3000, error: null },
                        frp: { isRunning: false, url: null, subdomain: null },
                        provider: { type: 'vllm', modelName: 'qwen3-max' },
                    }),
                });
            }
            if (url.includes('/api/providers')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        providers: [],
                        current: 'vllm',
                    }),
                });
            }
            return Promise.resolve({ json: () => Promise.resolve({}) });
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Start Tunnel')).toBeInTheDocument();
        });
    });

    it('calls API when start button is clicked', async () => {
        (global.fetch as any).mockImplementation((url: string, options?: any) => {
            if (url.includes('/api/status')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        mcp: { isRunning: false, port: 3000, error: null },
                        frp: { isRunning: false, url: null, subdomain: null },
                        provider: { type: 'vllm', modelName: 'qwen3-max' },
                    }),
                });
            }
            if (url.includes('/api/providers')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        providers: [],
                        current: 'vllm',
                    }),
                });
            }
            if (url.includes('/api/start') && options?.method === 'POST') {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        success: true,
                        mcpPort: 3000,
                        tunnelUrl: 'https://test123.mcp.innosynth.ai/mcp',
                        subdomain: 'test123',
                        message: 'MCP server and FRP tunnel started successfully',
                    }),
                });
            }
            return Promise.resolve({ json: () => Promise.resolve({}) });
        });

        render(<App />);

        await waitFor(() => {
            const startButton = screen.getByText('Start Tunnel');
            fireEvent.click(startButton);
        });

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/api/start', { method: 'POST' });
        });
    });

    it('displays provider selection options', async () => {
        (global.fetch as any).mockImplementation((url: string) => {
            if (url.includes('/api/status')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        mcp: { isRunning: false, port: 3000, error: null },
                        frp: { isRunning: false, url: null, subdomain: null },
                        provider: { type: 'vllm', modelName: 'qwen3-max' },
                    }),
                });
            }
            if (url.includes('/api/providers')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        providers: [
                            { id: 'gemini', name: 'Google Gemini', description: 'Google Gemini API', requiresApiKey: true },
                            { id: 'openai', name: 'OpenAI', description: 'OpenAI API or compatible', requiresApiKey: true, supportsCustomUrl: true },
                        ],
                        current: 'vllm',
                    }),
                });
            }
            return Promise.resolve({ json: () => Promise.resolve({}) });
        });

        render(<App />);

        await waitFor(() => {
            // Use getByRole for more specific selection
            const geminiButton = screen.getByRole('button', { name: /Google Gemini/i });
            expect(geminiButton).toBeInTheDocument();
        });
    });

    it('displays tunnel URL when running', async () => {
        (global.fetch as any).mockImplementation((url: string) => {
            if (url.includes('/api/status')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        mcp: { isRunning: true, port: 3000, error: null },
                        frp: { isRunning: true, url: 'https://test123.mcp.innosynth.ai/mcp', subdomain: 'test123' },
                        provider: { type: 'vllm', modelName: 'qwen3-max' },
                    }),
                });
            }
            if (url.includes('/api/providers')) {
                return Promise.resolve({
                    json: () => Promise.resolve({
                        providers: [],
                        current: 'vllm',
                    }),
                });
            }
            return Promise.resolve({ json: () => Promise.resolve({}) });
        });

        render(<App />);

        await waitFor(() => {
            // The URL is inside a <code> element - use queryByTestId or getByText with container
            const codeElement = screen.queryByText('https://test123.mcp.innosynth.ai/mcp');
            expect(codeElement).toBeInTheDocument();
        });
    });
});
