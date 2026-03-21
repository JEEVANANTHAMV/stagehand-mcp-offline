import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMachineId, generateSubdomain } from '../utils/machineId.js';
import os from 'os';
import { execSync } from 'child_process';

// Mock execSync
vi.mock('child_process', () => ({
    execSync: vi.fn(),
}));

// Mock os
vi.mock('os', () => ({
    default: {
        platform: vi.fn(),
        hostname: vi.fn(),
    },
}));

describe('Machine ID Utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getMachineId', () => {
        it('returns machine ID for Windows', () => {
            (os.platform as any).mockReturnValue('win32');
            (execSync as any).mockReturnValue('REG_SZ    {12345678-1234-1234-1234-123456789012}');

            const result = getMachineId();

            expect(result).toBe('{12345678-1234-1234-1234-123456789012}');
            expect(execSync).toHaveBeenCalledWith(
                'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid'
            );
        });

        it('returns machine ID for Linux', () => {
            (os.platform as any).mockReturnValue('linux');
            (execSync as any).mockReturnValue('abc123def456');

            const result = getMachineId();

            expect(result).toBe('abc123def456');
            expect(execSync).toHaveBeenCalledWith('cat /etc/machine-id || cat /var/lib/dbus/machine-id');
        });

        it('returns machine ID for macOS', () => {
            (os.platform as any).mockReturnValue('darwin');
            (execSync as any).mockReturnValue('    IOPlatformUUID" = "ABC123-DEF456-GHI789"');

            const result = getMachineId();

            expect(result).toBe('ABC123-DEF456-GHI789');
            expect(execSync).toHaveBeenCalledWith('ioreg -rd1 -c IOPlatformExpertDevice | grep -E "IOPlatformUUID"');
        });

        it('returns fallback ID for unknown platform', () => {
            (os.platform as any).mockReturnValue('unknown');
            (os.hostname as any).mockReturnValue('test-host');

            const result = getMachineId();

            expect(result).toBe('unknown-test-host');
        });

        it('returns fallback ID on error', () => {
            (os.platform as any).mockReturnValue('linux');
            (execSync as any).mockImplementation(() => {
                throw new Error('Command failed');
            });
            (os.hostname as any).mockReturnValue('test-host');

            const result = getMachineId();

            expect(result).toBe('unknown-test-host');
        });
    });

    describe('generateSubdomain', () => {
        it('generates valid subdomain from machine ID', () => {
            (os.platform as any).mockReturnValue('linux');
            (execSync as any).mockReturnValue('abc-123_def.456');

            const result = generateSubdomain();

            expect(result).toBe('abc123def456');
            expect(result.length).toBeLessThanOrEqual(12);
            expect(/^[a-z0-9]+$/.test(result)).toBe(true);
        });

        it('handles short machine IDs', () => {
            (os.platform as any).mockReturnValue('linux');
            (execSync as any).mockReturnValue('abc123');

            const result = generateSubdomain();

            expect(result).toBe('abc123');
        });

        it('truncates long machine IDs to 12 characters', () => {
            (os.platform as any).mockReturnValue('linux');
            (execSync as any).mockReturnValue('abcdefghijklmnopqrstuvwxyz123456');

            const result = generateSubdomain();

            expect(result).toBe('abcdefghij');
            expect(result.length).toBe(12);
        });
    });
});
