import { execSync } from 'child_process';
import os from 'os';

export function getMachineId() {
    try {
        if (os.platform() === 'win32') {
            return execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid').toString().split('REG_SZ')[1].trim();
        } else if (os.platform() === 'linux') {
            return execSync('cat /etc/machine-id || cat /var/lib/dbus/machine-id').toString().trim();
        } else if (os.platform() === 'darwin') {
            return execSync('ioreg -rd1 -c IOPlatformExpertDevice | grep -E "IOPlatformUUID"').toString().split('" = "')[1].split('"')[0].trim();
        }
        return 'unknown-' + os.hostname();
    } catch (e) {
        return 'unknown-' + os.hostname();
    }
}
