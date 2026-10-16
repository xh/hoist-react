/**
 * Path utilities for the Hoist MCP server.
 *
 * Provides repo root resolution (via `import.meta.url`), app root and installed package lookup
 * for companion library discovery, and safe path construction that prevents directory traversal
 * outside a package root.
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

/** Convert a filesystem path to POSIX (forward-slash) form. */
export function toPosixPath(p: string): string {
    return p.replace(/\\/g, '/');
}

/**
 * Repo root in POSIX (forward-slash) form, matching ts-morph's `getFilePath()`
 * convention, which always reports forward slashes on every platform.
 *
 * On Windows, {@link resolveRepoRoot} returns a backslash path (e.g.
 * `D:\hoist-react`) while ts-morph reports `D:/hoist-react/...`; comparing or
 * slicing the two directly fails, silently filtering out every source file and
 * yielding an empty symbol index. Use this whenever comparing against or
 * slicing a ts-morph source-file path (see `data/ts-registry.ts` and
 * `formatters/typescript.ts`). Filesystem access that stays within Node's
 * `path` APIs should keep using {@link resolveRepoRoot}.
 */
export function resolveRepoRootPosix(): string {
    return toPosixPath(resolveRepoRoot());
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

//------------------------------------------------------------------
// Consuming package (app root) and its dependencies
//------------------------------------------------------------------

/** The subset of a package.json the tools read. */
export interface PackageJson {
    name?: string;
    version?: string;
    description?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    hoist?: {docRegistry?: string};
}

/** Read `<dir>/package.json`, or return null if it is missing or unreadable. */
export function readPackageJson(dir: string): PackageJson | null {
    const path = resolve(dir, 'package.json');
    if (!existsSync(path)) return null;
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * Resolve the root of the package that consumes `@xh/hoist` - the anchor for companion library
 * discovery. The server cannot find companion libraries from its own location, because under
 * pnpm `@xh/hoist` lives in the `.pnpm` store and does not depend on them.
 *
 * Checks, in order:
 *  1. The `HOIST_MCP_APP_ROOT` env var, if set. Used as given.
 *  2. `cwd` and `cwd/client-app` (the standard Hoist app layout). The first with a package.json
 *     that is `@xh/hoist` or depends on it wins, else the first with any package.json.
 *
 * Returns null when no package.json is found. Params exist for specs - callers pass none.
 */
export function resolveAppRoot(
    cwd: string = process.cwd(),
    env: Record<string, string | undefined> = process.env
): string | null {
    if (env.HOIST_MCP_APP_ROOT) return resolve(cwd, env.HOIST_MCP_APP_ROOT);

    const found = [cwd, resolve(cwd, 'client-app')]
        .map(dir => ({dir, pkg: readPackageJson(dir)}))
        .filter(it => it.pkg != null);

    const usesHoist = found.find(({pkg}) => {
        const deps = {...pkg!.dependencies, ...pkg!.devDependencies, ...pkg!.peerDependencies};
        return pkg!.name === '@xh/hoist' || '@xh/hoist' in deps;
    });
    return (usesHoist ?? found[0])?.dir ?? null;
}

/**
 * Find an installed package by walking up from `fromDir` through each `node_modules/<name>`,
 * as Node does. Returns its `node_modules` path, which under pnpm is a link into the store, or
 * null if not installed. Reads the folder directly rather than `require.resolve()`, which fails
 * for packages whose `exports` map hides `package.json`.
 */
export function findInstalledPackage(fromDir: string, name: string): string | null {
    let dir = resolve(fromDir);
    while (true) {
        const candidate = resolve(dir, 'node_modules', name);
        if (existsSync(resolve(candidate, 'package.json'))) return candidate;
        const parent = dirname(dir);
        if (parent === dir) return null;
        dir = parent;
    }
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
