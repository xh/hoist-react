#!/usr/bin/env node
//
// Hoist Docs CLI launcher.
// Uses tsx to run the TypeScript CLI entry point directly.
// Resolves tsx via Node module resolution so it works both when running
// from the hoist-react repo and when installed as a dependency.
//
import {execFileSync} from 'child_process';
import {createRequire} from 'module';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(__dirname, '..', 'mcp', 'cli', 'docs.ts');

const require = createRequire(import.meta.url);
const tsxCli = resolve(dirname(require.resolve('tsx/package.json')), 'dist', 'cli.mjs');

try {
    execFileSync(process.execPath, [tsxCli, cliPath, ...process.argv.slice(2)], {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: {...process.env, HOIST_MCP_QUIET: '1'}
    });
} catch (e) {
    process.exit(e.status || 1);
}
