const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.production or .env
function loadEnv() {
    const envFiles = ['.env.production', '.env'];
    const envVars = {};

    for (const file of envFiles) {
        const fullPath = path.resolve(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                    const firstEq = trimmed.indexOf('=');
                    const key = trimmed.slice(0, firstEq).trim();
                    const val = trimmed.slice(firstEq + 1).trim();
                    if (!envVars[key]) {
                        envVars[key] = val;
                    }
                }
            }
        }
    }
    return envVars;
}

const env = loadEnv();
const dbUrl = env.SUPABASE_DB_URL || (
    env.SUPABASE_DB_PASSWORD 
        ? `postgresql://postgres.agqgrotwuvqnefqryoia:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`
        : null
);

if (!dbUrl) {
    console.error('Error: SUPABASE_DB_URL or SUPABASE_DB_PASSWORD not found in environment.');
    process.exit(1);
}

const args = ['db', 'push', '--db-url', dbUrl];

// Forward any flags passed to this script (e.g. --dry-run, --include-all)
const userArgs = process.argv.slice(2);
for (const arg of userArgs) {
    if (!args.includes(arg)) {
        args.push(arg);
    }
}

const isDryRun = args.includes('--dry-run');
console.log(`[RentFlex Migration Manager] Target Region: Central EU (Frankfurt)`);
console.log(`[RentFlex Migration Manager] Mode: ${isDryRun ? 'DRY-RUN (Safe Check)' : 'LIVE DEPLOYMENT'}`);

const result = spawnSync('supabase', args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env }
});

process.exit(result.status || 0);
