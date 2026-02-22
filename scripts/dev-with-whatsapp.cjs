const { spawn, spawnSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

const isWindows = process.platform === 'win32';
const rootDir = path.resolve(__dirname, '..');
const bridgeDir = path.join(rootDir, 'whatsapp-bridge');
const bridgeNodeModules = path.join(bridgeDir, 'node_modules');
const isProd = process.argv.includes('--prod');

// Load .env.local and .env so child processes inherit the variables
function loadEnvFile(filePath) {
    if (!existsSync(filePath)) return;
    const lines = readFileSync(filePath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const sep = trimmed.indexOf('=');
        if (sep <= 0) continue;
        const key = trimmed.slice(0, sep).trim();
        if (!key || process.env[key] !== undefined) continue;
        let value = trimmed.slice(sep + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    }
}
loadEnvFile(path.join(rootDir, '.env.local'));
loadEnvFile(path.join(rootDir, '.env'));

let shuttingDown = false;
const children = new Set();

function runNpm(args, cwd) {
    if (isWindows) {
        const command = `npm ${args.join(' ')}`;
        return spawn('cmd.exe', ['/d', '/s', '/c', command], {
            cwd,
            env: process.env,
            stdio: 'inherit',
        });
    }

    return spawn('npm', args, {
        cwd,
        env: process.env,
        stdio: 'inherit',
    });
}

function runNpmAndWait(args, cwd) {
    return new Promise((resolve, reject) => {
        const child = runNpm(args, cwd);
        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed: npm ${args.join(' ')} (code ${code ?? 1})`));
        });
    });
}

function hardKill(child) {
    if (!child.pid) return;
    if (isWindows) {
        spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    } else {
        child.kill('SIGKILL');
    }
}

function killAllChildren(signal = 'SIGTERM') {
    for (const child of children) {
        if (!child.killed) child.kill(signal);
    }
}

function gracefulShutdown(reason, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[services] Shutting down (${reason})...`);
    killAllChildren('SIGTERM');

    setTimeout(() => {
        for (const child of children) {
            if (!child.killed) hardKill(child);
        }
        process.exit(exitCode);
    }, 5000);
}

function startService(name, npmArgs) {
    const child = runNpm(npmArgs, rootDir);
    children.add(child);

    child.on('error', (error) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.error(`[services] "${name}" failed to start: ${error.message}`);
        killAllChildren('SIGTERM');
        process.exit(1);
    });

    child.on('exit', (code, signal) => {
        children.delete(child);
        if (shuttingDown) return;

        shuttingDown = true;
        console.error(`[services] "${name}" exited (code=${code ?? 'null'}, signal=${signal ?? 'null'}). Stopping remaining services.`);
        killAllChildren('SIGTERM');
        process.exit(code ?? 1);
    });

    return child;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripTrailingSlashes(value) {
    return value.replace(/\/+$/, '');
}

function resolveBridgeBaseUrl() {
    if (process.env.WA_BRIDGE_URL) {
        return stripTrailingSlashes(process.env.WA_BRIDGE_URL);
    }

    const host = process.env.WA_BRIDGE_HOST || '127.0.0.1';
    const port = process.env.WA_BRIDGE_PORT || '4000';
    return `http://${host}:${port}`;
}

function resolveWebBaseUrl() {
    const webUrl = process.env.WEB_URL || 'http://127.0.0.1:3000';
    return stripTrailingSlashes(webUrl);
}

async function waitForHealthy(name, url, options = {}) {
    const timeoutMs = options.timeoutMs ?? 30000;
    const intervalMs = options.intervalMs ?? 1000;
    const acceptStatus = options.acceptStatus ?? ((status) => status >= 200 && status < 300);
    const deadline = Date.now() + timeoutMs;

    let lastError = 'unreachable';

    while (Date.now() < deadline) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
            if (acceptStatus(response.status)) {
                console.log(`[health] ${name} healthy`);
                return;
            }

            lastError = `HTTP ${response.status}`;
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
        }

        await sleep(intervalMs);
    }

    throw new Error(`${name} did not become healthy (${url}) within ${timeoutMs}ms. Last error: ${lastError}`);
}

async function ensureBridgeDependencies() {
    if (existsSync(bridgeNodeModules)) return;

    console.log('[services] whatsapp-bridge dependencies not found. Installing...');
    await runNpmAndWait(['run', 'whatsapp:install'], rootDir);
}

async function main() {
    try {
        await ensureBridgeDependencies();
    } catch (error) {
        console.error(`[services] Failed to prepare whatsapp-bridge: ${error.message}`);
        process.exit(1);
    }

    const webScript = isProd ? 'start:web' : 'dev:web';
    console.log(`[services] Starting ${isProd ? 'production' : 'development'} stack (web + whatsapp)...`);

    startService('whatsapp', ['run', 'whatsapp']);
    startService('web', ['run', webScript]);

    const bridgeHealthUrl = `${resolveBridgeBaseUrl()}/status`;
    const webHealthUrl = `${resolveWebBaseUrl()}/api/health`;

    try {
        await Promise.all([
            waitForHealthy('whatsapp bridge', bridgeHealthUrl, { timeoutMs: 30000 }),
            waitForHealthy('web', webHealthUrl, { timeoutMs: 60000 }),
        ]);

        console.log('[services] All services are healthy.');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[services] Health check failed: ${message}`);
        gracefulShutdown('healthcheck_failed', 1);
    }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
    console.error(`[services] Uncaught exception: ${error.message}`);
    gracefulShutdown('uncaughtException', 1);
});
process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    console.error(`[services] Unhandled rejection: ${message}`);
    gracefulShutdown('unhandledRejection', 1);
});

main();
