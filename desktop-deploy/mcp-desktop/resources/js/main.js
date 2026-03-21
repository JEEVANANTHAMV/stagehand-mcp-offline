// Initialize Neutralino
Neutralino.init();

function addLog(text) {
    const logs = document.getElementById('logs');
    const container = document.getElementById('logs-container');
    container.classList.remove('hidden');
    const entry = document.createElement('div');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    logs.appendChild(entry);
    logs.scrollTop = logs.scrollHeight;
}

const modelProvider = document.getElementById('model-provider');
const providerFields = {
    gemini: document.getElementById('gemini-fields'),
    ollama: document.getElementById('ollama-fields'),
    vllm: document.getElementById('vllm-fields')
};

function updateProviders() {
    Object.keys(providerFields).forEach(key => {
        if (key === modelProvider.value) {
            providerFields[key].classList.remove('hidden');
        } else {
            providerFields[key].classList.add('hidden');
        }
    });
}

modelProvider.addEventListener('change', updateProviders);

// Persistent Trial Logic via Filesystem
const TRIAL_FILE = '/.innosynth_trial';

async function updateTrialStatus() {
    let startDate;
    try {
        const home = await Neutralino.os.getEnv('HOME');
        const userHome = home ? home : 'C:\\Users\\' + (await Neutralino.os.getEnv('USERNAME'));
        const path = userHome + TRIAL_FILE;
        
        try {
            const data = await Neutralino.filesystem.readFile(path);
            startDate = JSON.parse(data).startDate;
        } catch (e) {
            startDate = new Date().toISOString();
            await Neutralino.filesystem.writeFile(path, JSON.stringify({ startDate }));
        }

        const start = new Date(startDate);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const left = 15 - diff;
        const badge = document.getElementById('trial-info');
        
        if (left <= 0) {
            badge.innerText = 'TRIAL EXPIRED';
            badge.style.background = 'rgba(239, 68, 68, 0.1)';
            badge.style.color = '#ef4444';
            document.getElementById('start-btn').disabled = true;
            document.getElementById('start-btn').innerText = 'Contact Support for License';
        } else {
            badge.innerText = `${left} Days left of trial`;
        }
    } catch (e) {
        console.error('Trial status error:', e);
    }
}

async function getMachineId() {
    let id = 'unknown';
    try {
        if (NL_OS === 'Windows') {
            const out = await Neutralino.os.execCommand('powershell -Command "Get-CimInstance Win32_ComputerSystemProduct | Select-Object -ExpandProperty UUID"');
            id = out.stdOut.trim();
        } else if (NL_OS === 'Linux') {
            const out = await Neutralino.os.execCommand('cat /etc/machine-id || cat /var/lib/dbus/machine-id');
            id = out.stdOut.trim();
        } else if (NL_OS === 'Darwin') {
            const out = await Neutralino.os.execCommand('ioreg -rd1 -c IOPlatformExpertDevice | grep -E "IOPlatformUUID"');
            id = out.stdOut.split('" = "')[1].split('"')[0].trim();
        }
    } catch (e) { id = 'system-' + Math.random().toString(36).substring(2, 9); }
    return id.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16).toLowerCase();
}

document.getElementById('start-btn').addEventListener('click', async () => {
    const provider = modelProvider.value;
    const status = document.getElementById('status-text');
    const domainInfo = document.getElementById('domain-info');
    const machineId = await getMachineId();
    
    status.innerText = 'Initializing...';
    addLog('Initializing system...');

    const envVars = {
        STAGEHAND_ENV: 'LOCAL',
        HEADLESS: 'false'
    };

    if (provider === 'gemini') {
        const key = document.getElementById('gemini-key').value;
        if (!key) { alert('API Key required'); return; }
        envVars.GOOGLE_GENERATIVE_AI_API_KEY = key;
        envVars.MODEL_NAME = 'gemini-2.0-flash';
    } else if (provider === 'ollama') {
        envVars.MODEL_BASE_URL = document.getElementById('ollama-url').value;
        envVars.MODEL_NAME = 'openai/qwen3-max'; 
        envVars.OPENAI_API_KEY = 'any-key';
    } else if (provider === 'vllm') {
        envVars.MODEL_BASE_URL = document.getElementById('vllm-url').value;
        const key = document.getElementById('vllm-key').value;
        envVars.OPENAI_API_KEY = key || 'any-key';
        envVars.MODEL_NAME = 'openai/qwen3-max';
    }

    const binaryName = NL_OS === 'Windows' ? 'innosynth-mcp-win.exe' : 'innosynth-mcp';
    const frpcName = NL_OS === 'Windows' ? 'frpc.exe' : 'frpc';
    const binary = `./bin/${binaryName}`;
    const frpcBinary = `./bin/${frpcName}`;

    addLog(`Preparing to launch: ${binaryName}`);

    // Set Environment Variables globally for the current session (Neutralino limitation workaround)
    for (const [key, value] of Object.entries(envVars)) {
        // This only sets it for the Neutralino process itself, which spawnProcess inherits
        // But some OS might need explicit env passing in cmd
    }

    const mcpArgsArr = ['--experimental', '--port', '3000', '--host', '0.0.0.0'];
    const mcpArgs = mcpArgsArr.join(' ');
    
    let mcpPid;
    try {
        let spawnCmd = '';
        if (NL_OS === 'Windows') {
            const envStr = Object.entries(envVars).map(([k, v]) => `$env:${k}='${v}'`).join('; ');
            // Use powershell to set env and then run exe
            spawnCmd = `powershell -Command "${envStr}; ${binary} ${mcpArgs}"`;
        } else {
            const envStr = Object.entries(envVars).map(([k, v]) => `${k}='${v}'`).join(' ');
            spawnCmd = `sh -c "${envStr} ${binary} ${mcpArgs}"`;
        }
        
        addLog(`Spawning Process: ${spawnCmd}`);
        const mcpProcess = await Neutralino.os.spawnProcess(spawnCmd);
        mcpPid = mcpProcess.id;
        
        Neutralino.events.on('spawnedProcess', (evt) => {
            if (evt.detail.id === mcpPid) {
                if (evt.detail.action === 'stdOut') addLog(evt.detail.data);
                if (evt.detail.action === 'stdErr') addLog(`Err: ${evt.detail.data}`);
                if (evt.detail.action === 'exit') addLog(`Backend exited with code: ${evt.detail.data}`);
            }
        });
        
        addLog(`Backend started (PID: ${mcpPid})`);
    } catch (e) {
        addLog(`Spawn Backend failed: ${e.message}. Falling back to background exec...`);
        // Fallback for older systems
        const envStr = Object.entries(envVars).map(([k, v]) => NL_OS === 'Windows' ? `$env:${k}='${v}'` : `${k}='${v}'`).join(NL_OS === 'Windows' ? '; ' : ' ');
        const cmd = NL_OS === 'Windows' 
            ? `powershell -Command "${envStr}; Start-Process ${binary} -ArgumentList '${mcpArgsArr.join("','")}' -WindowStyle Hidden"`
            : `${envStr} ${binary} ${mcpArgs}`;
        await Neutralino.os.execCommand(cmd, { background: true });
    }

    status.innerText = 'Status: Connecting Tunnel...';
    addLog('Generating tunnel configuration...');
    
    // Generate frpc.ini
    const TOKEN = '48f8ef8d08aa5c4d9adab6b3b7f7b9df';
    const frpcConfig = `[common]\nserver_addr = 172.174.244.221\nserver_port = 7000\ntoken = ${TOKEN}\n\n[${machineId}]\ntype = http\nlocal_ip = 127.0.0.1\nlocal_port = 3000\nsubdomain = ${machineId}\n`;
    await Neutralino.filesystem.writeFile(window.NL_CWD + '/bin/frpc.ini', frpcConfig);
    
    addLog('Tunnel Config saved.');

    // Run frpc
    addLog('Launching Tunnel...');
    try {
        const frpcProcess = await Neutralino.os.spawnProcess(`${frpcBinary} -c ./bin/frpc.ini`);
        const frpcPid = frpcProcess.id;
        
        Neutralino.events.on('spawnedProcess', (evt) => {
            if (evt.detail.id === frpcPid) {
                if (evt.detail.action === 'stdOut') addLog(`[Tunnel] ${evt.detail.data}`);
                if (evt.detail.action === 'stdErr') addLog(`[Tunnel-Err] ${evt.detail.data}`);
            }
        });
        addLog(`Tunnel started.`);
    } catch (e) {
        const frpcCmd = NL_OS === 'Windows' 
            ? `powershell -Command "Start-Process ${frpcBinary} -ArgumentList '-c','./bin/frpc.ini' -WindowStyle Hidden"`
            : `${frpcBinary} -c ./bin/frpc.ini`;
        await Neutralino.os.execCommand(frpcCmd, { background: true });
    }

    status.innerText = '🚀 Online and Ready';
    domainInfo.innerText = `Public Domain: ${machineId}.mcp-test.innosynth.org/mcp`;
    document.getElementById('start-btn').disabled = true;
    document.getElementById('start-btn').innerText = 'System Running';
});

updateTrialStatus();
updateProviders();
