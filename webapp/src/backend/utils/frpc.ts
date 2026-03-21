import { spawn, SpawnOptions } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { generateSubdomain } from './machineId.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRP_SERVER_ADDR = '172.174.244.221';
const FRP_SERVER_PORT = 7000;
const FRP_TOKEN = '48f8ef8d08aa5c4d9adab6b3b7f7b9df';

export interface FrpcConfig {
  subdomain: string;
  localPort: number;
  configPath: string;
}

export interface FrpcProcess {
  process: ReturnType<typeof spawn>;
  config: FrpcConfig;
  url: string;
}

export function generateFrpcConfig(subdomain: string, localPort: number): { configPath: string; configContent: string } {
  const configPath = path.join(os.tmpdir(), `frpc-${subdomain}.ini`);
  const configContent = `[common]
server_addr = ${FRP_SERVER_ADDR}
server_port = ${FRP_SERVER_PORT}
token = ${FRP_TOKEN}

[${subdomain}]
type = http
local_ip = 127.0.0.1
local_port = ${localPort}
subdomain = ${subdomain}
`;
  return { configPath, configContent };
}

export function getFrpcBinaryPath(): string | null {
  const platform = os.platform();

  // Define the exact path based on platform - binaries are in webapp directory
  // __dirname is webapp/src/backend/utils, so ../../../ goes to webapp/
  let frpcPath: string;
  if (platform === 'win32') {
    frpcPath = path.join(__dirname, '..', '..', '..', 'frp_0.54.0_windows_amd64', 'frpc.exe');
  } else {
    frpcPath = path.join(__dirname, '..', '..', '..', 'frp_0.54.0_linux_amd64', 'frpc');
  }

  if (fs.existsSync(frpcPath)) {
    return frpcPath;
  }

  return null;
}

export async function startFrpcTunnel(localPort: number = 3000): Promise<FrpcProcess | null> {
  const subdomain = generateSubdomain();
  const { configPath, configContent } = generateFrpcConfig(subdomain, localPort);

  // Write config file
  fs.writeFileSync(configPath, configContent);
  console.log(`[FRPC] Config written to: ${configPath}`);

  // Get FRPC binary path
  const frpcBinary = getFrpcBinaryPath();
  if (!frpcBinary) {
    console.error('[FRPC] Binary not found. Please ensure frpc is in the bin/ directory.');
    return null;
  }

  console.log(`[FRPC] Starting tunnel with binary: ${frpcBinary}`);
  console.log(`[FRPC] Subdomain: ${subdomain}`);

  const spawnOptions: SpawnOptions = {
    stdio: 'pipe',
    detached: false,
  };

  const frpcProcess = spawn(frpcBinary, ['-c', configPath], spawnOptions);

  const url = `http://${subdomain}.innosynth.org/mcp`;

  // Handle process output
  frpcProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    console.log(`[FRPC STDOUT] ${output.trim()}`);
  });

  frpcProcess.stderr?.on('data', (data) => {
    const output = data.toString();
    console.log(`[FRPC STDERR] ${output.trim()}`);
  });

  frpcProcess.on('error', (err) => {
    console.error(`[FRPC] Error: ${err.message}`);
  });

  frpcProcess.on('close', (code) => {
    console.log(`[FRPC] Tunnel closed with code ${code}`);
  });

  return {
    process: frpcProcess,
    config: {
      subdomain,
      localPort,
      configPath,
    },
    url,
  };
}

export function stopFrpcTunnel(frpcProcess: ReturnType<typeof spawn>) {
  frpcProcess.kill('SIGTERM');
  console.log('[FRPC] Tunnel stopped');
}
