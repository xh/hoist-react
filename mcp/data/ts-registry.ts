/**
 * TypeScript symbol extraction data layer for the Hoist MCP server.
 *
 * Wraps ts-morph to parse hoist-react's TypeScript source files, builds a
 * searchable symbol index, and provides on-demand extraction of detailed type
 * information. This module is consumed by the three TypeScript MCP tools:
 * hoist-search-symbols, hoist-get-symbol, and hoist-get-members.
 *
 * The ts-morph Project is created lazily (on first invocation, not at server
 * startup) to avoid cold start delays. Once created, a lightweight symbol
 * index is eagerly built using AST-level methods for fast search without
 * per-query AST traversal. Detailed symbol info is extracted on-demand.
 */
import {Project} from 'ts-morph';
import {resolve} from 'node:path';

import {log} from '../util/logger.js';
import {resolveRepoRoot} from '../util/paths.js';

//------------------------------------------------------------------
// Types
//------------------------------------------------------------------

/** Kind of TypeScript symbol in the index. */
export type SymbolKind = 'class' | 'interface' | 'type' | 'function' | 'const' | 'enum';

/** Lightweight index entry for fast search. */
export interface SymbolEntry {
    name: string;
    kind: SymbolKind;
    filePath: string;
    isExported: boolean;
    sourcePackage: string;
}

/** Detailed symbol information extracted on-demand. */
export interface SymbolDetail {
    name: string;
    kind: SymbolKind;
    filePath: string;
    sourcePackage: string;
    isExported: boolean;
    signature: string;
    jsDoc: string;
    extends?: string;
    implements?: string[];
    decorators?: string[];
}

/** A member (property or method) of a class or interface. */
export interface MemberInfo {
    name: string;
    kind: 'property' | 'method' | 'accessor';
    type: string;
    isStatic: boolean;
    isOptional?: boolean;
    decorators: string[];
    jsDoc: string;
    parameters?: Array<{name: string; type: string}>;
    returnType?: string;
}

//------------------------------------------------------------------
// Module state (lazy initialization)
//------------------------------------------------------------------

let project: Project | null = null;
let symbolIndex: Map<string, SymbolEntry[]> | null = null;

//------------------------------------------------------------------
// Package derivation
//------------------------------------------------------------------

/** Known top-level package directories in hoist-react. */
const TOP_LEVEL_PACKAGES = [
    'core',
    'data',
    'svc',
    'cmp',
    'desktop',
    'mobile',
    'format',
    'appcontainer',
    'utils',
    'promise',
    'mobx',
    'public',
    'static',
    'admin',
    'inspector',
    'icon'
];

/**
 * Derive the source package from a file's absolute path.
 * e.g. `/repo/core/HoistBase.ts` maps to `core`,
 *      `/repo/cmp/grid/GridModel.ts` maps to `cmp/grid`.
 */
function derivePackage(filePath: string, repoRoot: string): string {
    const rel = filePath.slice(repoRoot.length + 1);
    const parts = rel.split('/');

    if (parts.length > 0 && TOP_LEVEL_PACKAGES.includes(parts[0])) {
        const pkgParts = [parts[0]];
        for (let i = 1; i < parts.length - 1; i++) {
            if (!parts[i].includes('.')) {
                pkgParts.push(parts[i]);
            } else {
                break;
            }
        }
        return pkgParts.join('/');
    }
    return parts[0] || 'unknown';
}

//------------------------------------------------------------------
// Index building
//------------------------------------------------------------------

/**
 * Add a symbol entry to the index, keyed by lowercase name.
 * Skips symbols with empty or anonymous names.
 */
function addToIndex(index: Map<string, SymbolEntry[]>, entry: SymbolEntry): void {
    if (!entry.name || entry.name === '(anonymous)') return;
    const key = entry.name.toLowerCase();
    const existing = index.get(key);
    if (existing) {
        existing.push(entry);
    } else {
        index.set(key, [entry]);
    }
}

/**
 * Build the symbol index by scanning all source files using AST-level methods.
 *
 * Uses getClasses(), getInterfaces(), getTypeAliases(), getFunctions(),
 * getEnums(), and getVariableStatements() -- NOT getExportedDeclarations(),
 * which triggers full type binding and is ~1000x slower.
 */
function buildSymbolIndex(proj: Project): Map<string, SymbolEntry[]> {
    const index = new Map<string, SymbolEntry[]>();
    const repoRoot = resolveRepoRoot();

    const counts = {total: 0, exported: 0, byKind: {} as Record<string, number>};

    for (const sourceFile of proj.getSourceFiles()) {
        const filePath = sourceFile.getFilePath();

        // Skip non-source files
        if (
            filePath.includes('node_modules') ||
            filePath.includes('/build/') ||
            filePath.includes('/mcp/')
        ) {
            continue;
        }

        const pkg = derivePackage(filePath, repoRoot);

        // Classes
        for (const cls of sourceFile.getClasses()) {
            const name = cls.getName();
            if (!name) continue;
            const entry: SymbolEntry = {
                name,
                kind: 'class',
                filePath,
                isExported: cls.isExported(),
                sourcePackage: pkg
            };
            addToIndex(index, entry);
            counts.total++;
            if (entry.isExported) counts.exported++;
            counts.byKind['class'] = (counts.byKind['class'] || 0) + 1;
        }

        // Interfaces
        for (const iface of sourceFile.getInterfaces()) {
            const name = iface.getName();
            if (!name) continue;
            const entry: SymbolEntry = {
                name,
                kind: 'interface',
                filePath,
                isExported: iface.isExported(),
                sourcePackage: pkg
            };
            addToIndex(index, entry);
            counts.total++;
            if (entry.isExported) counts.exported++;
            counts.byKind['interface'] = (counts.byKind['interface'] || 0) + 1;
        }

        // Type aliases
        for (const typeAlias of sourceFile.getTypeAliases()) {
            const name = typeAlias.getName();
            if (!name) continue;
            const entry: SymbolEntry = {
                name,
                kind: 'type',
                filePath,
                isExported: typeAlias.isExported(),
                sourcePackage: pkg
            };
            addToIndex(index, entry);
            counts.total++;
            if (entry.isExported) counts.exported++;
            counts.byKind['type'] = (counts.byKind['type'] || 0) + 1;
        }

        // Functions
        for (const func of sourceFile.getFunctions()) {
            const name = func.getName();
            if (!name) continue;
            const entry: SymbolEntry = {
                name,
                kind: 'function',
                filePath,
                isExported: func.isExported(),
                sourcePackage: pkg
            };
            addToIndex(index, entry);
            counts.total++;
            if (entry.isExported) counts.exported++;
            counts.byKind['function'] = (counts.byKind['function'] || 0) + 1;
        }

        // Enums
        for (const enumDecl of sourceFile.getEnums()) {
            const name = enumDecl.getName();
            if (!name) continue;
            const entry: SymbolEntry = {
                name,
                kind: 'enum',
                filePath,
                isExported: enumDecl.isExported(),
                sourcePackage: pkg
            };
            addToIndex(index, entry);
            counts.total++;
            if (entry.isExported) counts.exported++;
            counts.byKind['enum'] = (counts.byKind['enum'] || 0) + 1;
        }

        // Exported const variables
        for (const stmt of sourceFile.getVariableStatements()) {
            if (!stmt.isExported()) continue;
            for (const decl of stmt.getDeclarations()) {
                const name = decl.getName();
                if (!name) continue;
                const entry: SymbolEntry = {
                    name,
                    kind: 'const',
                    filePath,
                    isExported: true,
                    sourcePackage: pkg
                };
                addToIndex(index, entry);
                counts.total++;
                counts.exported++;
                counts.byKind['const'] = (counts.byKind['const'] || 0) + 1;
            }
        }
    }

    const kindSummary = Object.entries(counts.byKind)
        .map(([kind, count]) => `${kind}: ${count}`)
        .join(', ');

    log.info(
        `Symbol index built: ${counts.total} total symbols (${counts.exported} exported) -- ${kindSummary}`
    );

    return index;
}

//------------------------------------------------------------------
// Public API
//------------------------------------------------------------------

/**
 * Ensure the ts-morph Project and symbol index are initialized.
 *
 * Creates the Project lazily on first call, then eagerly builds the symbol
 * index. Subsequent calls return immediately. Safe to call multiple times.
 */
export function ensureInitialized(): void {
    if (project) return;

    const startMs = Date.now();

    project = new Project({
        tsConfigFilePath: resolve(resolveRepoRoot(), 'tsconfig.json'),
        skipFileDependencyResolution: true
    });
    project.resolveSourceFileDependencies();

    symbolIndex = buildSymbolIndex(project);

    const elapsed = Date.now() - startMs;
    log.info(`TypeScript registry initialized in ${elapsed}ms`);
    if (elapsed > 5000) {
        log.warn(`TypeScript registry initialization exceeded 5s target (${elapsed}ms)`);
    }
}

/**
 * Search the symbol index by query string.
 *
 * Supports case-insensitive substring matching against symbol names.
 * Optionally filter by kind and/or export status.
 */
export function searchSymbols(
    query: string,
    options?: {kind?: SymbolKind; exported?: boolean; limit?: number}
): SymbolEntry[] {
    ensureInitialized();

    const queryLower = query.toLowerCase().trim();
    if (!queryLower) return [];

    const limit = options?.limit ?? 50;
    const results: SymbolEntry[] = [];

    for (const [key, entries] of symbolIndex!) {
        if (!key.includes(queryLower)) continue;

        for (const entry of entries) {
            if (options?.kind && entry.kind !== options.kind) continue;
            if (options?.exported !== undefined && entry.isExported !== options.exported) continue;
            results.push(entry);
        }
    }

    // Sort: exact matches first, then exported before non-exported, then alphabetically
    results.sort((a, b) => {
        const aExact = a.name.toLowerCase() === queryLower ? 0 : 1;
        const bExact = b.name.toLowerCase() === queryLower ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;

        const aExported = a.isExported ? 0 : 1;
        const bExported = b.isExported ? 0 : 1;
        if (aExported !== bExported) return aExported - bExported;

        return a.name.localeCompare(b.name);
    });

    return results.slice(0, limit);
}

/**
 * Get detailed information about a specific symbol.
 * Stub -- implemented in Task 2.
 */
export function getSymbolDetail(name: string, filePath?: string): SymbolDetail | null {
    return null;
}

/**
 * Get members (properties, methods, accessors) of a class or interface.
 * Stub -- implemented in Task 2.
 */
export function getMembers(
    name: string,
    filePath?: string
): {symbol: SymbolDetail; members: MemberInfo[]} | null {
    return null;
}
