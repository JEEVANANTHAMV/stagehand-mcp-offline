import fs from 'fs';
import path from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TRIAL_PATH = path.homedir() + '/.innosynth_trial';

export function checkTrial() {
    if (!fs.existsSync(TRIAL_PATH)) {
        const startData = {
            startDate: new Date().toISOString(),
            trialDays: 15
        };
        fs.writeFileSync(TRIAL_PATH, JSON.stringify(startData));
        return { valid: true, daysLeft: 15 };
    }

    const data = JSON.parse(fs.readFileSync(TRIAL_PATH, 'utf-8'));
    const start = new Date(data.startDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeft = 15 - diff;

    if (daysLeft <= 0) {
        return { valid: false, daysLeft: 0 };
    }

    return { valid: true, daysLeft };
}
