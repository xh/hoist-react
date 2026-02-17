/**
 * Path utilities for the Hoist MCP server.
 *
 * Provides repo root resolution (via `import.meta.url`) and safe path
 * construction that prevents directory traversal outside the repository.
 */
import {existsSync} from 'node:fs';
import {resolve, dirname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

/** Cached repo root -- resolved once and reused. */
let cachedRepoRoot: string | undefined;

/**
 * Resolve the hoist-react repo root by walking up from this file's location.
 *
 * The file lives at `mcp/util/paths.ts`, so the repo root is two directories
 * up. A sanity check verifies that `AGENTS.md` exists at the resolved root.
 * The result is cached after the first call.
 */
export function resolveRepoRoot(): string {
    if (cachedRepoRoot) return cachedRepoRoot;

    const thisFile = fileURLToPath(import.meta.url);
    // mcp/util/paths.ts -> mcp/util/ -> mcp/ -> repo root
    const repoRoot = resolve(dirname(thisFile), '..', '..');

    if (!existsSync(resolve(repoRoot, 'AGENTS.md'))) {
        throw new Error(
            `Cannot resolve repo root: expected AGENTS.md at ${repoRoot}. ` +
                'Ensure the MCP server is running from within the hoist-react repository.'
        );
    }

    cachedRepoRoot = repoRoot;
    return repoRoot;
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
