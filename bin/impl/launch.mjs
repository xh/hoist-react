//
// Shared launcher for the hoist-mcp, hoist-docs and hoist-ts bins.
//
// The MCP server and CLIs are TypeScript, run directly with tsx. tsx and the other packages they
// import are optional peer dependencies of @xh/hoist, so an app pays for them only when it installs
// them. This launcher resolves them through Node's module resolution, which works both from the
// hoist-react repository and from an app's node_modules, and names the missing ones when it cannot.
//
import {execFileSync} from 'child_process';
import {createRequire} from 'module';
import {dirname, resolve} from 'path';

const require = createRequire(import.meta.url);

/** Optional peers the tools import at runtime, each with a specifier the package resolves. */
const TOOLING_PEERS = [
    ['tsx', 'tsx/package.json'],
    ['@modelcontextprotocol/sdk', '@modelcontextprotocol/sdk/package.json'],
    ['zod', 'zod'],
    ['ts-morph', 'ts-morph'],
    ['minisearch', 'minisearch'],
    ['commander', 'commander']
];

/**
 * Run a TypeScript entry point under tsx, forwarding CLI args, and exit with its status.
 *
 * @param entryPath - absolute path to the `.ts` entry point
 * @param env - extra environment variables for the child process
 */
export function launch(entryPath, env = {}) {
    const missing = TOOLING_PEERS.filter(([, specifier]) => !resolves(specifier)).map(
        ([name]) => name
    );
    if (missing.length) {
        console.error(
            `The Hoist developer tools need these packages, which @xh/hoist declares as optional ` +
                `peer dependencies: ${missing.join(', ')}.\n` +
                `Install them as devDependencies of your app, for example:\n\n` +
                `    pnpm add -D ${TOOLING_PEERS.map(([name]) => name).join(' ')}\n\n` +
                `See mcp/README.md in @xh/hoist for details.`
        );
        process.exit(1);
    }

    const tsxCli = resolve(dirname(require.resolve('tsx/package.json')), 'dist', 'cli.mjs');
    try {
        execFileSync(process.execPath, [tsxCli, entryPath, ...process.argv.slice(2)], {
            stdio: ['inherit', 'inherit', 'inherit'],
            env: {...process.env, ...env}
        });
    } catch (e) {
        process.exit(e.status || 1);
    }
}

function resolves(specifier) {
    try {
        require.resolve(specifier);
        return true;
    } catch {
        return false;
    }
}
