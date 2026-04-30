/**
 * Disk-persisted cache for the TypeScript symbol/member indexes.
 *
 * Turns cold CLI invocations from multi-second ts-morph builds into sub-second
 * loads when source files haven't changed. The cache stores the prebuilt
 * `symbolIndex`, `memberIndex`, and `promiseExtensionDetails`, keyed by a
 * fingerprint over the indexable source-file set (path + mtime + size).
 *
 * Cache hit: deserialize and skip the ts-morph build. The live `Project` is
 * only constructed if/when a detail-extraction call (`getSymbolDetail`,
 * `getMembers`) needs AST access.
 *
 * Cache miss / stale: returns null. Caller falls back to the full build path,
 * then writes a fresh cache via `writeCache`.
 *
 * Invalidation:
 *   - any source file's mtime or size changes
 *   - `package.json` mtime/size changes (catches snapshot/version bumps)
 *   - {@link CACHE_SCHEMA_VERSION} bump for breaking changes to entry shape
 */
import {createHash} from 'node:crypto';
import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    renameSync,
    statSync,
    unlinkSync,
    writeFileSync
} from 'node:fs';
import {dirname, resolve} from 'node:path';

import {log} from '../util/logger.js';
import type {SymbolEntry, MemberIndexEntry, SymbolDetail} from './ts-registry.js';

/**
 * Bump when the shape of {@link SymbolEntry}, {@link MemberIndexEntry}, or
 * {@link SymbolDetail} changes in a way that would make existing caches
 * misleading. Old caches are silently discarded on schema mismatch.
 */
const CACHE_SCHEMA_VERSION = 1;

/** Directories pruned from the fingerprint walk - mirrors `buildSymbolIndex` filters. */
const EXCLUDED_DIRS = new Set(['node_modules', 'build', 'mcp', '.git', '.idea', '.vscode', 'docs']);

/**
 * Indexer source files whose changes invalidate the cache despite living under
 * the excluded `mcp/` tree. Without this, a Hoist developer editing the
 * indexer logic would keep loading caches built by the previous version of
 * the code until an unrelated source file changed. Paths are relative to
 * repoRoot.
 */
const INDEXER_SOURCES = ['mcp/data/ts-registry.ts', 'mcp/data/index-cache.ts'];

interface CachePayload {
    schemaVersion: number;
    fingerprint: string;
    symbols: [string, SymbolEntry[]][];
    members: [string, MemberIndexEntry[]][];
    promiseExtensions: [string, SymbolDetail][];
}

export interface CachedIndexes {
    symbols: Map<string, SymbolEntry[]>;
    members: Map<string, MemberIndexEntry[]>;
    promiseExtensions: Map<string, SymbolDetail>;
}

function cachePath(repoRoot: string): string {
    return resolve(repoRoot, 'node_modules', '.cache', 'hoist-mcp', 'index-v1.json');
}

/**
 * Hash all candidate source files (path + mtime + size) plus `package.json`,
 * yielding a fingerprint that changes whenever any indexable file or the
 * package version changes. Mirrors the file-set filter applied in
 * `buildSymbolIndex` so the fingerprint and the indexed file set stay in sync.
 *
 * Walks the repo tree once. ~290 files in hoist-react; one stat per file.
 * Sub-100ms on a fast disk.
 */
export function computeFingerprint(repoRoot: string): string {
    const entries: string[] = [];

    function walk(dir: string): void {
        let dirents;
        try {
            dirents = readdirSync(dir, {withFileTypes: true});
        } catch {
            return;
        }
        for (const entry of dirents) {
            if (entry.name.startsWith('.')) continue;
            if (entry.isDirectory()) {
                if (EXCLUDED_DIRS.has(entry.name)) continue;
                walk(resolve(dir, entry.name));
            } else if (entry.isFile()) {
                if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;
                const fullPath = resolve(dir, entry.name);
                try {
                    const stats = statSync(fullPath);
                    const rel = fullPath.slice(repoRoot.length);
                    entries.push(`${rel}:${stats.mtimeMs}:${stats.size}`);
                } catch {
                    // skip unreadable files
                }
            }
        }
    }

    walk(repoRoot);
    entries.sort();

    const hash = createHash('sha256');
    for (const e of entries) hash.update(e + '\n');

    try {
        const pkgStat = statSync(resolve(repoRoot, 'package.json'));
        hash.update(`pkg:${pkgStat.mtimeMs}:${pkgStat.size}`);
    } catch {
        // package.json must exist (resolveRepoRoot enforces this); if stat
        // fails for an unrelated reason we just skip the mix-in.
    }

    for (const rel of INDEXER_SOURCES) {
        try {
            const stat = statSync(resolve(repoRoot, rel));
            hash.update(`indexer:${rel}:${stat.mtimeMs}:${stat.size}`);
        } catch {
            // Indexer sources may be absent in unusual setups (e.g. a stripped
            // package without the `mcp/` tree). Skip the mix-in rather than
            // fail; the index would just be unbuildable in that environment.
        }
    }

    return hash.digest('hex');
}

/**
 * Try to load cached indexes for the given repo. Returns `null` if the cache
 * is missing, malformed, schema-mismatched, or fingerprint-stale - in any of
 * those cases the caller should fall back to a fresh build.
 *
 * Set `HOIST_MCP_NO_CACHE=1` in the environment to bypass cache reads (useful
 * for debugging).
 */
export function loadCache(repoRoot: string): CachedIndexes | null {
    if (process.env.HOIST_MCP_NO_CACHE) return null;

    const filePath = cachePath(repoRoot);
    if (!existsSync(filePath)) return null;

    let payload: CachePayload;
    try {
        payload = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (e) {
        log.debug(`Cache read failed, will rebuild: ${e}`);
        return null;
    }

    if (payload.schemaVersion !== CACHE_SCHEMA_VERSION) {
        log.debug(
            `Cache schema mismatch (cached=${payload.schemaVersion}, expected=${CACHE_SCHEMA_VERSION}); rebuilding`
        );
        return null;
    }

    const fingerprint = computeFingerprint(repoRoot);
    if (payload.fingerprint !== fingerprint) {
        log.debug('Cache fingerprint stale; rebuilding');
        return null;
    }

    return {
        symbols: new Map(payload.symbols),
        members: new Map(payload.members),
        promiseExtensions: new Map(payload.promiseExtensions)
    };
}

/**
 * Write index data to disk atomically (write-to-tmp then rename). Failures
 * are logged but non-fatal - the next invocation just rebuilds.
 */
export function writeCache(repoRoot: string, fingerprint: string, indexes: CachedIndexes): void {
    if (process.env.HOIST_MCP_NO_CACHE) return;

    const filePath = cachePath(repoRoot);

    try {
        mkdirSync(dirname(filePath), {recursive: true});
    } catch (e) {
        log.warn(`Failed to create cache dir, registry won't persist: ${e}`);
        return;
    }

    const payload: CachePayload = {
        schemaVersion: CACHE_SCHEMA_VERSION,
        fingerprint,
        symbols: [...indexes.symbols.entries()],
        members: [...indexes.members.entries()],
        promiseExtensions: [...indexes.promiseExtensions.entries()]
    };

    const tmpPath = `${filePath}.${process.pid}.tmp`;
    try {
        writeFileSync(tmpPath, JSON.stringify(payload));
        renameSync(tmpPath, filePath);
    } catch (e) {
        log.warn(`Failed to write registry cache: ${e}`);
        try {
            unlinkSync(tmpPath);
        } catch {
            // best-effort cleanup
        }
    }
}
