import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getMachineId } from './machineId.js';

const TOKEN = '48f8ef8d08aa5c4d9adab6b3b7f7b9df';

export async function startFrpc(machineId: string) {
    const configPath = path.join(os.tmpdir(), `frpc-${machineId}.ini`);
    const configContent = `[common]
server_addr = 172.174.244.221
server_port = 7000
token = ${TOKEN}

[${machineId}]
type = http
local_ip = 127.0.0.1
local_port = 3000
subdomain = ${machineId}
`;

    fs.writeFileSync(configPath, configContent);

    const platform = os.platform();
    const frpcBinary = platform === 'win32' ? 'frpc.exe' : 'frpc';
    const binaryPath = path.join(process.cwd(), 'bin', frpcBinary);

    if (!fs.existsSync(binaryPath)) {
        console.error(`FRPC binary not found at ${binaryPath}. Please download it.`);
        return null;
    }

    console.log(`Starting FRPC tunnel with machine ID: ${machineId}`);
    const frpcProcess = spawn(binaryPath, ['-c', configPath], { stdio: 'inherit' });

    frpcProcess.on('close', (code) => {
        console.log(`FRPC tunnel closed with code ${code}`);
    });

    return frpcProcess;
}

export function generateMachineId(): string {
    return getMachineId().replace(/[^a-zA-Z0-9]/g, '').substring(0, 16).toLowerCase();
}
