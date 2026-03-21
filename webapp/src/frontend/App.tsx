import React, { useState, useEffect } from 'react';

interface StatusResponse {
    mcp: {
        isRunning: boolean;
        port: number;
        error: string | null;
    };
    frp: {
        isRunning: boolean;
        url: string | null;
        subdomain: string | null;
    };
    provider: {
        type: string;
        modelName: string;
    };
}

interface Provider {
    id: string;
    name: string;
    description: string;
    hidden?: boolean;
    requiresApiKey?: boolean;
    supportsCustomUrl?: boolean;
}

const App: React.FC = () => {
    const [status, setStatus] = useState<StatusResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStarting, setIsStarting] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [selectedProvider, setSelectedProvider] = useState('vllm');
    const [apiKey, setApiKey] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [modelName, setModelName] = useState('qwen3-max');
    const [error, setError] = useState<string | null>(null);

    // Fetch status on mount and periodically
    useEffect(() => {
        fetchStatus();
        fetchProviders();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            setStatus(data);
            if (data.provider) {
                setSelectedProvider(data.provider.type);
                setModelName(data.provider.modelName || 'qwen3-max');
            }
            setError(null);
        } catch (err) {
            console.error('Failed to fetch status:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProviders = async () => {
        try {
            const response = await fetch('/api/providers');
            const data = await response.json();
            setProviders(data.providers.filter((p: Provider) => !p.hidden));
        } catch (err) {
            console.error('Failed to fetch providers:', err);
        }
    };

    const handleStart = async () => {
        setIsStarting(true);
        setError(null);

        // Update provider config if not vllm
        if (selectedProvider !== 'vllm') {
            try {
                await fetch('/api/provider', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: selectedProvider,
                        apiKey: selectedProvider === 'vllm' ? undefined : apiKey,
                        baseUrl: selectedProvider === 'openai' ? baseUrl : undefined,
                        modelName,
                    }),
                });
            } catch (err) {
                console.error('Failed to update provider:', err);
            }
        }

        try {
            const response = await fetch('/api/start', { method: 'POST' });
            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to start MCP server');
            } else {
                fetchStatus();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsStarting(false);
        }
    };

    const handleStop = async () => {
        setIsStopping(true);
        setError(null);

        try {
            const response = await fetch('/api/stop', { method: 'POST' });
            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to stop MCP server');
            } else {
                fetchStatus();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsStopping(false);
        }
    };

    const handleProviderChange = async (providerId: string) => {
        setSelectedProvider(providerId);
        try {
            await fetch('/api/provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: providerId }),
            });
        } catch (err) {
            console.error('Failed to update provider:', err);
        }
    };

    const isRunning = status?.mcp.isRunning && status?.frp.isRunning;

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold gradient-text text-glow mb-2">
                        Innosynth MCP
                    </h1>
                    <p className="text-white/60 text-lg">
                        AI-Powered Browser Automation Server
                    </p>
                </div>

                {/* Main Panel */}
                <div className="glass-panel p-8 mb-6">
                    {/* Status Section */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <span className="w-1 h-6 bg-cyan-500 rounded-full"></span>
                            Server Status
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="text-white/40 text-sm mb-2">MCP Server</div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`pulse-dot ${status?.mcp.isRunning ? 'pulse-dot-running' : 'pulse-dot-stopped'
                                            }`}
                                    ></span>
                                    <span className="font-medium">
                                        {status?.mcp.isRunning ? 'Running' : 'Stopped'}
                                    </span>
                                </div>
                                {status?.mcp.isRunning && (
                                    <div className="text-white/40 text-sm mt-2">
                                        Port: {status.mcp.port}
                                    </div>
                                )}
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="text-white/40 text-sm mb-2">FRP Tunnel</div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`pulse-dot ${status?.frp.isRunning ? 'pulse-dot-running' : 'pulse-dot-stopped'
                                            }`}
                                    ></span>
                                    <span className="font-medium">
                                        {status?.frp.isRunning ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Provider Selection */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                            AI Provider
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-white/40 text-sm mb-2 block">
                                    Select Provider
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {providers.map((provider) => (
                                        <button
                                            key={provider.id}
                                            onClick={() => handleProviderChange(provider.id)}
                                            className={`p-4 rounded-xl border transition-all duration-200 text-left ${selectedProvider === provider.id
                                                ? 'bg-cyan-500/20 border-cyan-500/50'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="font-medium">{provider.name}</div>
                                            <div className="text-white/40 text-sm">{provider.description}</div>
                                        </button>
                                    ))}
                                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                                        <div className="font-medium text-green-400">InnoSynth</div>
                                        <div className="text-white/40 text-sm">
                                            Local inference server - Pre-configured
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedProvider !== 'vllm' && (
                                <div className="space-y-4 animate-fadeIn">
                                    {providers.find((p) => p.id === selectedProvider)?.requiresApiKey && (
                                        <div>
                                            <label className="text-white/40 text-sm mb-2 block">
                                                API Key
                                            </label>
                                            <input
                                                type="password"
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                placeholder="Enter your API key"
                                                className="input-field"
                                            />
                                        </div>
                                    )}
                                    {providers.find((p) => p.id === selectedProvider)?.supportsCustomUrl && (
                                        <div>
                                            <label className="text-white/40 text-sm mb-2 block">
                                                Base URL (optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={baseUrl}
                                                onChange={(e) => setBaseUrl(e.target.value)}
                                                placeholder="https://api.example.com/v1"
                                                className="input-field"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                {/* <label className="text-white/40 text-sm mb-2 block">
                                    Model Name
                                </label>
                                <input
                                    type="text"
                                    value={modelName}
                                    onChange={(e) => setModelName(e.target.value)}
                                    placeholder="qwen3-max"
                                    className="input-field"
                                /> */}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mb-8">
                        {!isRunning ? (
                            <button
                                onClick={handleStart}
                                disabled={isStarting}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {isStarting ? (
                                    <>
                                        <svg
                                            className="animate-spin h-5 w-5"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        Start Tunnel
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleStop}
                                disabled={isStopping}
                                className="btn-danger w-full flex items-center justify-center gap-2"
                            >
                                {isStopping ? (
                                    <>
                                        <svg
                                            className="animate-spin h-5 w-5"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Stopping...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                                            />
                                        </svg>
                                        Stop Tunnel
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Tunnel URL */}
                    {isRunning && status?.frp.url && (
                        <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl p-6 border border-cyan-500/30">
                            <div className="text-white/40 text-sm mb-2">Your MCP Tunnel URL</div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-black/30 rounded-lg px-4 py-3 text-cyan-400 font-mono text-lg break-all">
                                    {status.frp.url}
                                </code>
                                <button
                                    onClick={() =>
                                        navigator.clipboard.writeText(status.frp.url || '')
                                    }
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    Copy
                                </button>
                            </div>
                            <div className="text-white/40 text-sm mt-3 flex items-center gap-2">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                Subdomain: {status.frp.subdomain}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mt-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-red-400">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                {error}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center text-white/40 text-sm">
                    <p>Powered by Stagehand & FRP Tunneling</p>
                </div>
            </div>
        </div>
    );
};

export default App;
