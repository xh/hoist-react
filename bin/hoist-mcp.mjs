#!/usr/bin/env node
//
// Hoist MCP Server launcher.
// Uses tsx to run the TypeScript server entry point directly.
//
import {execFileSync} from 'child_process';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = resolve(__dirname, '..', 'mcp', 'server.ts');
const tsxPath = resolve(__dirname, '..', 'node_modules', '.bin', 'tsx');

try {
    execFileSync(tsxPath, [serverPath], {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: {...process.env}
    });
} catch (e) {
    process.exit(e.status || 1);
}
