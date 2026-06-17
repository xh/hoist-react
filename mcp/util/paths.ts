/**
 * Path utilities for the Hoist MCP server.
 *
 * Provides repo root resolution (via `import.meta.url`) and safe path
 * construction that prevents directory traversal outside the repository.
 */
import {existsSync, readFileSync} from 'node:fs';
import {resolve, dirname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

/** Cached repo root -- resolved once and reused. */
let cachedRepoRoot: string | undefined;

/** Cached hoist library version -- resolved once and reused. */
let cachedHoistVersion: string | undefined;

/**
 * Resolve the hoist-react repo root by walking up from this file's location.
 *
 * The file lives at `mcp/util/paths.ts`, so the repo root is two directories
 * up. A sanity check verifies that `package.json` exists at the resolved root.
 * The result is cached after the first call.
 */
export function resolveRepoRoot(): string {
    if (cachedRepoRoot) return cachedRepoRoot;

    const thisFile = fileURLToPath(import.meta.url);
    // mcp/util/paths.ts -> mcp/util/ -> mcp/ -> repo root
    const repoRoot = resolve(dirname(thisFile), '..', '..');

    if (!existsSync(resolve(repoRoot, 'package.json'))) {
        throw new Error(
            `Cannot resolve package root: expected package.json at ${repoRoot}. ` +
                'Ensure the MCP server is running from within hoist-react (repo checkout or node_modules).'
        );
    }

    cachedRepoRoot = repoRoot;
    return repoRoot;
}

/**
 * Resolve the `@xh/hoist` library version from the repo root `package.json`.
 *
 * Used by the connectivity-check surfaces (`hoist-ping` tool, `hoist-docs ping`
 * CLI) so a sanity check also reports which hoist version is being indexed.
 * The result is cached after the first call.
 */
export function resolveHoistVersion(): string {
    if (cachedHoistVersion) return cachedHoistVersion;

    const pkgPath = resolve(resolveRepoRoot(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {version?: string};
    cachedHoistVersion = pkg.version ?? 'unknown';
    return cachedHoistVersion;
}

/**
 * Resolve a relative path within the repo root, with traversal protection.
 *
 * Rejects any `relativePath` containing `..` segments and verifies that the
 * resolved absolute path falls within (or equals) `repoRoot`.
 *
 * @throws Error if path traversal is detected.
 */
export function resolveDocPath(repoRoot: string, relativePath: string): string {
    if (relativePath.includes('..')) {
        throw new Error(`Path traversal detected: "${relativePath}" contains '..' segments`);
    }

    const resolved = resolve(repoRoot, relativePath);

    if (resolved !== repoRoot && !resolved.startsWith(repoRoot + sep)) {
        throw new Error(`Path traversal detected: "${relativePath}" resolves outside repo root`);
    }

    return resolved;
}
