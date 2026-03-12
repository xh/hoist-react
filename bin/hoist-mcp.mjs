#!/usr/bin/env node
//
// Hoist MCP Server launcher.
// Uses tsx to run the TypeScript server entry point directly.
// Resolves tsx via Node module resolution so it works both when running
// from the hoist-react repo and when installed as a dependency.
//
import {execFileSync} from 'child_process';
import {createRequire} from 'module';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, '..', 'mcp', 'server.ts');

// Resolve the tsx CLI via Node's module resolution, which searches up the
// node_modules tree. This works whether tsx is a dependency of hoist-react
// itself or installed in a parent app's node_modules.
const require = createRequire(import.meta.url);
const tsxCli = resolve(dirname(require.resolve('tsx/package.json')), 'dist', 'cli.mjs');

try {
    execFileSync(process.execPath, [tsxCli, serverPath], {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: {...process.env}
    });
} catch (e) {
    process.exit(e.status || 1);
}
