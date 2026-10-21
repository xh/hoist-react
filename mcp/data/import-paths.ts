/**
 * Import path resolution for indexed symbols.
 *
 * The package barrel (`@xh/hoist/cmp/grid`) is the preferred import: apps use barrels far more
 * than deep imports, and barrels are the curated API surface. The resolver finds it when one
 * exists: `@xh/hoist/` plus the shallowest directory whose `index.ts` re-exports the symbol,
 * walking from the declaring file upward and following any chain of `export * from` /
 * `export {name} from` statements between barrels. When no barrel reaches an exported symbol,
 * the file itself still imports - the package has no `exports` map - and the tools show
 * {@link fileImportPath} instead.
 *
 * The barrel path is computed once per index build and stored on each `SymbolEntry`, so the
 * disk cache carries it. The file path is derived at output time.
 */
import type {Project, SourceFile} from 'ts-morph';

/** Resolve the barrel import path of `name` declared in `filePath` (POSIX, absolute). */
export type ImportPathResolver = (filePath: string, name: string) => string | null;

/** Names an `export ... from` statement re-exports from its target: every export, or a set. */
type Exported = 'all' | Set<string>;

interface ExportEdge {
    target: string;
    names: Exported;
}

/**
 * Build a resolver over every `index.ts` barrel in the repo. Barrel reachability is computed
 * lazily per barrel and memoized, since most barrels are only consulted for their own subtree.
 */
export function createImportPathResolver(project: Project, repoRoot: string): ImportPathResolver {
    const prefix = repoRoot + '/',
        isIndexable = (path: string) =>
            path.startsWith(prefix) &&
            !path.includes('/node_modules/') &&
            !path.includes('/build/') &&
            !path.includes('/mcp/');

    // Barrel file path keyed by its directory, relative to the repo root (`cmp/grid`).
    const barrels = new Map<string, SourceFile>();
    for (const sf of project.getSourceFiles()) {
        const path = sf.getFilePath();
        if (!isIndexable(path) || !path.endsWith('/index.ts')) continue;
        barrels.set(path.slice(prefix.length, -'/index.ts'.length), sf);
    }

    const edgeCache = new Map<string, ExportEdge[]>(),
        reachCache = new Map<string, Map<string, Exported>>();

    /** Re-export statements of a file, resolved to their target source files. */
    function edgesOf(sf: SourceFile): ExportEdge[] {
        const path = sf.getFilePath();
        let edges = edgeCache.get(path);
        if (edges) return edges;

        edges = [];
        for (const decl of sf.getExportDeclarations()) {
            // `export * as ns from` exposes members as `ns.X`, not as direct imports.
            if (!decl.hasModuleSpecifier() || decl.getNamespaceExport()) continue;
            const target = decl.getModuleSpecifierSourceFile();
            if (!target) continue;
            const named = decl.getNamedExports();
            edges.push({
                target: target.getFilePath(),
                names: named.length ? new Set(named.map(n => n.getName())) : 'all'
            });
        }
        edgeCache.set(path, edges);
        return edges;
    }

    /** Every file a barrel reaches, with the names it re-exports from each. */
    function reachOf(barrel: SourceFile): Map<string, Exported> {
        const start = barrel.getFilePath();
        let reach = reachCache.get(start);
        if (reach) return reach;

        reach = new Map();
        const visit = (sf: SourceFile, allowed: Exported) => {
            const path = sf.getFilePath(),
                prior = reach!.get(path);
            if (prior === 'all') return;
            if (allowed === 'all') {
                reach!.set(path, 'all');
            } else {
                const merged = new Set(prior ?? []),
                    before = merged.size;
                allowed.forEach(n => merged.add(n));
                if (prior && merged.size === before) return;
                reach!.set(path, merged);
            }
            for (const edge of edgesOf(sf)) {
                const names = edge.names,
                    next: Exported =
                        allowed === 'all'
                            ? names
                            : names === 'all'
                              ? allowed
                              : new Set([...allowed].filter(n => names.has(n)));
                if (next !== 'all' && next.size === 0) continue;
                const target = project.getSourceFile(edge.target);
                if (target) visit(target, next);
            }
        };
        visit(barrel, 'all');
        reachCache.set(start, reach);
        return reach;
    }

    return (filePath, name) => {
        if (!isIndexable(filePath)) return null;
        const segments = filePath.slice(prefix.length).split('/').slice(0, -1);
        for (let depth = 1; depth <= segments.length; depth++) {
            const dir = segments.slice(0, depth).join('/'),
                barrel = barrels.get(dir);
            if (!barrel) continue;
            const exported = reachOf(barrel).get(filePath);
            if (exported === 'all' || (exported != null && exported.has(name))) {
                return `@xh/hoist/${dir}`;
            }
        }
        return null;
    };
}

/**
 * Import path of a declaring file (`@xh/hoist/data/cube/row/LeafRow`): `@xh/hoist/` plus the
 * repo-relative file path without its extension. The import to show when no barrel re-exports
 * a symbol - the package has no `exports` map, so a deep import always resolves.
 */
export function fileImportPath(relPath: string): string {
    return `@xh/hoist/${relPath.replace(/\.tsx?$/, '')}`;
}
