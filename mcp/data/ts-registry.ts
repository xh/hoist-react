/**
 * TypeScript symbol extraction data layer for the Hoist MCP server.
 *
 * Wraps ts-morph to parse hoist-react's TypeScript source files, builds a
 * searchable symbol index, and provides on-demand extraction of detailed type
 * information. This module is consumed by the three TypeScript MCP tools:
 * hoist-search-symbols, hoist-get-symbol, and hoist-get-members.
 *
 * Initialization is kicked off asynchronously after server startup via
 * `beginInitialization()`, so the index is typically ready before the first
 * tool call arrives. If a tool call arrives before init completes,
 * `ensureInitialized()` awaits the in-flight init. Once created, a
 * lightweight symbol index and parallel member index are built using
 * AST-level methods for fast search without per-query AST traversal.
 * Detailed symbol info is extracted on-demand.
 */
import {Project, Node, Scope, SyntaxKind} from 'ts-morph';
import type {
    ClassDeclaration,
    FunctionDeclaration,
    InterfaceDeclaration,
    SourceFile
} from 'ts-morph';
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
    /** JSDoc, if available. Populated at index time; displayed in search results. */
    jsDoc: string;
    /**
     * Short hint for member-indexed owners, sourced from an `@mcpHint` JSDoc tag
     * on the declaration. Shown alongside member search results to clarify how
     * the owner fits into the framework (e.g. "model backing all grid
     * components"). Omitted when the declaration has no `@mcpHint` tag.
     */
    mcpHint?: string;
    /**
     * Space-separated own member names for member-indexed owners (classes and `*Config`
     * interfaces), used to expand the searchable text in symbol search. Only includes
     * members directly declared on the owner - inherited HoistBase/HoistModel members
     * are excluded to avoid noise from ubiquitous framework plumbing (destroy,
     * addReaction, etc.). Empty for owners whose members are not indexed.
     */
    memberNames?: string;
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
    constructorType?: string;
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
    inheritedFrom?: string;
}

/** Lightweight index entry for a class member, enabling search by member name. */
export interface MemberIndexEntry {
    name: string;
    memberKind: 'property' | 'method' | 'accessor';
    ownerName: string;
    ownerHint: string;
    filePath: string;
    sourcePackage: string;
    isStatic: boolean;
    type: string;
    jsDoc: string;
    decorators: string[];
}

//------------------------------------------------------------------
// Module state (lazy initialization)
//------------------------------------------------------------------

let project: Project | null = null;
let symbolIndex: Map<string, SymbolEntry[]> | null = null;
let memberIndex: Map<string, MemberIndexEntry[]> | null = null;
/** Pre-computed detail for Promise prototype extensions (not extractable via standard AST lookup). */
let promiseExtensionDetails: Map<string, SymbolDetail> | null = null;

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
 * Which classes and interfaces have their public members indexed for member search
 * is determined by rule (see `shouldIndexClassMembers` / `shouldIndexInterfaceMembers`):
 *
 *   - every exported class
 *   - every exported interface whose name ends in `Config` (the Hoist convention for
 *     configuration-object shapes consumed by class constructors)
 *
 * Each indexed owner can carry an optional short hint via an `@mcpHint` JSDoc tag
 * on its declaration (e.g. `@mcpHint model backing all grid components`). The tag
 * text is extracted by `extractMcpHint` and shown alongside the owner name in
 * member search results. Collocating the hint with the declaration avoids the
 * name-collision and maintenance-drift problems of a separate hand-curated registry.
 */

/** True if the given class should have its public members indexed for search. */
function shouldIndexClassMembers(cls: ClassDeclaration): boolean {
    return cls.isExported();
}

/** True if the given interface should have its public members indexed for search. */
function shouldIndexInterfaceMembers(name: string, isExported: boolean): boolean {
    return isExported && name.endsWith('Config');
}

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

/** Add a member entry to the member index, keyed by lowercase member name. */
function addToMemberIndex(index: Map<string, MemberIndexEntry[]>, entry: MemberIndexEntry): void {
    const key = entry.name.toLowerCase();
    const existing = index.get(key);
    if (existing) {
        existing.push(entry);
    } else {
        index.set(key, [entry]);
    }
}

/**
 * Check if a member should be excluded from the index as private/internal.
 * Excludes members with the `private` keyword or names starting with `_`.
 */
function isPrivateMember(member: MemberInfo, cls: ClassDeclaration): boolean {
    if (member.name.startsWith('_')) return true;

    // Check for explicit `private` keyword on the AST node
    try {
        const node =
            cls.getProperty(member.name) ??
            cls.getGetAccessor(member.name) ??
            cls.getMethod(member.name) ??
            cls.getStaticProperty(member.name) ??
            cls.getStaticMethod(member.name);
        if (node) {
            const scope = (node as unknown as {getScope?: () => string}).getScope?.();
            if (scope === Scope.Private) return true;
        }
    } catch {
        // If we can't determine scope, keep the member (assume public)
    }

    return false;
}

/** Format a method's parameter list and return type as a compact type string. */
function formatMethodType(member: MemberInfo): string {
    const params = (member.parameters ?? []).map(p => `${p.name}: ${p.type}`).join(', ');
    const ret = member.returnType ?? 'void';
    return `(${params}) => ${ret}`;
}

/**
 * Build the symbol index by scanning all source files using AST-level methods.
 * Also builds a parallel member index for every exported class and every exported
 * `*Config` interface (see `shouldIndexClassMembers` / `shouldIndexInterfaceMembers`).
 *
 * Uses getClasses(), getInterfaces(), getTypeAliases(), getFunctions(),
 * getEnums(), and getVariableStatements() -- NOT getExportedDeclarations(),
 * which triggers full type binding and is ~1000x slower.
 */
function buildSymbolIndex(proj: Project): {
    symbols: Map<string, SymbolEntry[]>;
    members: Map<string, MemberIndexEntry[]>;
} {
    const index = new Map<string, SymbolEntry[]>();
    const mIndex = new Map<string, MemberIndexEntry[]>();
    const repoRoot = resolveRepoRoot();

    const counts = {total: 0, exported: 0, byKind: {} as Record<string, number>};
    let memberCount = 0;

    // Collect public member names per member-indexed owner (class or interface)
    // during indexing. Keyed by `${name}|${filePath}` so that two exported owners
    // with the same name across packages (e.g. `View` in both `cmp/viewmanager`
    // and `data/cube`, `ColChooserModel` in both `desktop` and `mobile`) don't
    // clobber each other. After all files are processed, these are used to populate
    // `memberNames` on the corresponding symbol entries (excluding inherited
    // HoistBase/HoistModel members to avoid noise from ubiquitous framework plumbing).
    interface OwnerMemberRecord {
        name: string;
        filePath: string;
        memberNames: string[];
    }
    const memberNamesByOwner = new Map<string, OwnerMemberRecord>();
    const ownerKey = (name: string, filePath: string) => `${name}|${filePath}`;

    for (const sourceFile of proj.getSourceFiles()) {
        const filePath = sourceFile.getFilePath();

        // Skip non-source files — use path relative to repoRoot so that
        // hoist-react's own sources are included even when the package is
        // installed under an app's node_modules directory.
        const relPath = filePath.startsWith(repoRoot + '/')
            ? filePath.slice(repoRoot.length)
            : null;
        if (
            !relPath ||
            relPath.startsWith('/node_modules/') ||
            relPath.includes('/build/') ||
            relPath.includes('/mcp/')
        ) {
            continue;
        }

        const pkg = derivePackage(filePath, repoRoot);

        // Classes
        for (const cls of sourceFile.getClasses()) {
            const name = cls.getName();
            if (!name) continue;
            const mcpHint = extractMcpHint(cls);
            const entry: SymbolEntry = {
                name,
                kind: 'class',
                filePath,
                isExported: cls.isExported(),
                sourcePackage: pkg,
                jsDoc: extractJsDoc(cls),
                mcpHint
            };
            addToIndex(index, entry);
            counts.total++;
            if (entry.isExported) counts.exported++;
            counts.byKind['class'] = (counts.byKind['class'] || 0) + 1;

            // Index public members for every exported class.
            if (shouldIndexClassMembers(cls)) {
                const ownerHint = mcpHint;
                try {
                    const members = extractClassMembers(sourceFile, name);
                    const classPublicNames: string[] = [];
                    for (const m of members) {
                        if (isPrivateMember(m, cls)) continue;
                        classPublicNames.push(m.name);
                        const mEntry: MemberIndexEntry = {
                            name: m.name,
                            memberKind: m.kind,
                            ownerName: name,
                            ownerHint,
                            filePath,
                            sourcePackage: pkg,
                            isStatic: m.isStatic,
                            type: m.kind === 'method' ? formatMethodType(m) : m.type,
                            jsDoc: m.jsDoc,
                            decorators: m.decorators
                        };
                        addToMemberIndex(mIndex, mEntry);
                        memberCount++;
                    }
                    memberNamesByOwner.set(ownerKey(name, filePath), {
                        name,
                        filePath,
                        memberNames: classPublicNames
                    });
                } catch (e) {
                    log.warn(`Failed to index members for ${name}: ${e}`);
                }
            }
        }

        // Interfaces
        for (const iface of sourceFile.getInterfaces()) {
            const name = iface.getName();
            if (!name) continue;
            let jsDoc = extractJsDoc(iface);
            if (!jsDoc) jsDoc = extractCompanionJsDoc(sourceFile, name);
            const isExported = iface.isExported();
            const mcpHint = extractMcpHint(iface);
            const entry: SymbolEntry = {
                name,
                kind: 'interface',
                filePath,
                isExported,
                sourcePackage: pkg,
                jsDoc,
                mcpHint
            };
            addToIndex(index, entry);
            counts.total++;
            if (entry.isExported) counts.exported++;
            counts.byKind['interface'] = (counts.byKind['interface'] || 0) + 1;

            // Index public members for exported `*Config` interfaces, which describe the
            // configuration surface of the classes that accept them as constructor arg.
            if (shouldIndexInterfaceMembers(name, isExported)) {
                const ownerHint = mcpHint;
                try {
                    const members = extractInterfaceMembers(sourceFile, name);
                    const publicNames: string[] = [];
                    for (const m of members) {
                        if (m.name.startsWith('_')) continue;
                        publicNames.push(m.name);
                        const mEntry: MemberIndexEntry = {
                            name: m.name,
                            memberKind: m.kind,
                            ownerName: name,
                            ownerHint,
                            filePath,
                            sourcePackage: pkg,
                            isStatic: m.isStatic,
                            type: m.kind === 'method' ? formatMethodType(m) : m.type,
                            jsDoc: m.jsDoc,
                            decorators: m.decorators
                        };
                        addToMemberIndex(mIndex, mEntry);
                        memberCount++;
                    }
                    memberNamesByOwner.set(ownerKey(name, filePath), {
                        name,
                        filePath,
                        memberNames: publicNames
                    });
                } catch (e) {
                    log.warn(`Failed to index members for ${name}: ${e}`);
                }
            }
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
                sourcePackage: pkg,
                jsDoc: extractJsDoc(typeAlias)
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
                sourcePackage: pkg,
                jsDoc: extractFunctionJsDoc(func)
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
                sourcePackage: pkg,
                jsDoc: extractJsDoc(enumDecl)
            };
            addToIndex(index, entry);
            counts.total++;
            if (entry.isExported) counts.exported++;
            counts.byKind['enum'] = (counts.byKind['enum'] || 0) + 1;
        }

        // Exported const variables
        for (const stmt of sourceFile.getVariableStatements()) {
            if (!stmt.isExported()) continue;
            const stmtJsDoc = extractJsDoc(stmt);
            for (const decl of stmt.getDeclarations()) {
                // For destructured exports (e.g. `export const [Foo, foo] = ...`),
                // index each binding element as a separate symbol so both the
                // PascalCase component and camelCase factory are individually
                // searchable and resolvable via exact name lookup.
                const nameNode = decl.getNameNode();
                const names: string[] = [];
                if (nameNode.isKind(SyntaxKind.ArrayBindingPattern)) {
                    for (const el of nameNode.getElements()) {
                        if (Node.isOmittedExpression(el)) continue;
                        const n = el.getName();
                        if (n) names.push(n);
                    }
                } else if (nameNode.isKind(SyntaxKind.ObjectBindingPattern)) {
                    for (const el of nameNode.getElements()) {
                        const n = el.getName();
                        if (n) names.push(n);
                    }
                } else {
                    const n = decl.getName();
                    if (n) names.push(n);
                }

                for (const name of names) {
                    const entry: SymbolEntry = {
                        name,
                        kind: 'const',
                        filePath,
                        isExported: true,
                        sourcePackage: pkg,
                        jsDoc: stmtJsDoc
                    };
                    addToIndex(index, entry);
                    counts.total++;
                    counts.exported++;
                    counts.byKind['const'] = (counts.byKind['const'] || 0) + 1;
                }
            }
        }
    }

    // Index Promise prototype extensions from promise/Promise.ts
    const promiseFile = proj.getSourceFile(sf => sf.getFilePath().endsWith('/promise/Promise.ts'));
    if (promiseFile) {
        indexPromiseExtensions(promiseFile, index, mIndex, resolveRepoRoot());
    }

    // Populate `memberNames` on symbol entries for every member-indexed owner
    // (classes and `*Config` interfaces). Excludes inherited HoistBase/HoistModel
    // members so that queries like "StoreRecord raw" surface StoreRecord, but
    // generic terms like "destroy" or "addReaction" don't match every class.
    // HoistBase and HoistModel each exist in exactly one file so a name-based
    // lookup is sufficient for computing `baseMemberNames`.
    const collectByName = (n: string): string[] => {
        for (const v of memberNamesByOwner.values()) {
            if (v.name === n) return v.memberNames;
        }
        return [];
    };
    const baseMemberNames = new Set(
        [...collectByName('HoistBase'), ...collectByName('HoistModel')].map(n => n.toLowerCase())
    );

    for (const {
        name: ownerName,
        filePath: ownerFile,
        memberNames: allNames
    } of memberNamesByOwner.values()) {
        if (ownerName === 'HoistBase' || ownerName === 'HoistModel') continue;
        const ownNames = allNames.filter(n => !baseMemberNames.has(n.toLowerCase()));
        if (ownNames.length === 0) continue;
        const entries = index.get(ownerName.toLowerCase());
        if (entries) {
            for (const entry of entries) {
                if (entry.name === ownerName && entry.filePath === ownerFile) {
                    entry.memberNames = ownNames.join(' ');
                }
            }
        }
    }

    const kindSummary = Object.entries(counts.byKind)
        .map(([kind, count]) => `${kind}: ${count}`)
        .join(', ');

    log.info(
        `Symbol index built: ${counts.total} total symbols (${counts.exported} exported) -- ${kindSummary}`
    );
    log.info(
        `Member index built: ${memberCount} public members across ${memberNamesByOwner.size} owners`
    );

    return {symbols: index, members: mIndex};
}

/**
 * Index Promise prototype extension methods declared in promise/Promise.ts.
 *
 * These are declared via `declare global { interface Promise<T> { ... } }` and
 * implemented on `Promise.prototype`. They're a core part of Hoist's async API
 * but don't appear as standalone symbols or class members without special handling.
 *
 * Adds each method to the member index (searchable as members of "Promise") and
 * as standalone function entries in the symbol index (searchable by name).
 */
function indexPromiseExtensions(
    sourceFile: SourceFile,
    symbolIdx: Map<string, SymbolEntry[]>,
    memberIdx: Map<string, MemberIndexEntry[]>,
    repoRoot: string
): void {
    const filePath = sourceFile.getFilePath();
    const pkg = derivePackage(filePath, repoRoot);
    promiseExtensionDetails = new Map();

    // Find the `declare global { interface Promise<T> { ... } }` block
    for (const globalDecl of sourceFile.getChildrenOfKind(SyntaxKind.ModuleDeclaration)) {
        if (globalDecl.getName() !== 'global') continue;

        const body = globalDecl.getBody();
        if (!body || !Node.isModuleBlock(body)) continue;

        for (const iface of body.getChildrenOfKind(SyntaxKind.InterfaceDeclaration)) {
            if (iface.getName() !== 'Promise') continue;

            for (const method of iface.getMethods()) {
                const name = method.getName();
                if (!name || name === 'throwIfFailsSelector') continue;

                const jsDoc = extractJsDoc(method);
                const params = method.getParameters().map(p => ({
                    name: p.getName(),
                    type: safeGetTypeText(p, p)
                }));
                let returnType: string;
                try {
                    returnType = method.getReturnType().getText(method);
                } catch {
                    returnType = 'Promise<T>';
                }

                // Add to member index as a Promise method
                const paramStr = params.map(p => `${p.name}: ${p.type}`).join(', ');
                addToMemberIndex(memberIdx, {
                    name,
                    memberKind: 'method',
                    ownerName: 'Promise',
                    ownerHint: 'Promise prototype extension (Hoist async utility)',
                    filePath,
                    sourcePackage: pkg,
                    isStatic: false,
                    type: `(${paramStr}) => ${returnType}`,
                    jsDoc,
                    decorators: []
                });

                // Add as a searchable symbol entry
                addToIndex(symbolIdx, {
                    name,
                    kind: 'function',
                    filePath,
                    isExported: true,
                    sourcePackage: pkg,
                    jsDoc
                });

                // Pre-compute detail for `getSymbolDetail()` since these can't be
                // found via standard `sourceFile.getFunction()` lookup.
                const sig = `${name}(${paramStr}): ${returnType}`;
                promiseExtensionDetails.set(name, {
                    name,
                    kind: 'function',
                    filePath,
                    sourcePackage: pkg,
                    isExported: true,
                    signature: sig,
                    jsDoc
                });
            }
        }
    }

    log.info('Indexed Promise prototype extensions from promise/Promise.ts');
}

//------------------------------------------------------------------
// Public API
//------------------------------------------------------------------

/** Promise for in-flight initialization, used to coordinate eager and on-demand init. */
let initPromise: Promise<void> | null = null;

/** Synchronous init — heavy lifting, runs on a microtask when kicked off eagerly. */
function doInitialize(): void {
    if (project) return;

    const startMs = Date.now();

    project = new Project({
        tsConfigFilePath: resolve(resolveRepoRoot(), 'tsconfig.json'),
        skipFileDependencyResolution: true
    });
    project.resolveSourceFileDependencies();

    const result = buildSymbolIndex(project);
    symbolIndex = result.symbols;
    memberIndex = result.members;

    const elapsed = Date.now() - startMs;
    log.info(`TypeScript registry initialized in ${elapsed}ms`);
    if (elapsed > 5000) {
        log.warn(`TypeScript registry initialization exceeded 5s target (${elapsed}ms)`);
    }
}

/**
 * Begin TypeScript registry initialization in the background.
 *
 * Call this after server startup to warm the index asynchronously, so the
 * first tool invocation doesn't pay the full init cost. Safe to call
 * multiple times — subsequent calls are no-ops.
 */
export function beginInitialization(): void {
    if (project || initPromise) return;
    initPromise = Promise.resolve().then(() => {
        doInitialize();
        initPromise = null;
    });
}

/**
 * Ensure the ts-morph Project and symbol index are initialized.
 *
 * If {@link beginInitialization} was called, awaits the in-flight init.
 * Otherwise initializes synchronously. Safe to call multiple times.
 */
export async function ensureInitialized(): Promise<void> {
    if (project) return;
    if (initPromise) return initPromise;
    doInitialize();
}

/**
 * Search the symbol index by query string.
 *
 * Supports case-insensitive matching against symbol names, JSDoc, and own member names
 * (for member-indexed owners). Multi-word queries are split into tokens - all tokens
 * must match (AND logic) against the combined searchable text. Results are scored: name
 * matches rank above JSDoc/member-only matches.
 *
 * Optionally filter by kind and/or export status.
 */
export async function searchSymbols(
    query: string,
    options?: {kind?: SymbolKind; exported?: boolean; limit?: number}
): Promise<SymbolEntry[]> {
    await ensureInitialized();

    const queryLower = query.toLowerCase().trim();
    if (!queryLower) return [];

    const tokens = queryLower.split(/\s+/);
    const limit = options?.limit ?? 50;
    const scored: {entry: SymbolEntry; nameMatches: number}[] = [];

    for (const [key, entries] of symbolIndex!) {
        for (const entry of entries) {
            if (options?.kind && entry.kind !== options.kind) continue;
            if (options?.exported !== undefined && entry.isExported !== options.exported) continue;

            const jsDocLower = entry.jsDoc?.toLowerCase() ?? '';
            const memberNamesLower = entry.memberNames?.toLowerCase() ?? '';
            const searchable = key + ' ' + jsDocLower + ' ' + memberNamesLower;

            // All tokens must match somewhere in the combined searchable text.
            if (!tokens.every(t => searchable.includes(t))) continue;

            // Count how many tokens matched the name specifically (for ranking).
            const nameMatches = tokens.filter(t => key.includes(t)).length;
            scored.push({entry, nameMatches});
        }
    }

    // Sort: most name-token matches first, then exact name match, then exported, then alpha.
    scored.sort((a, b) => {
        // Prefer entries where more tokens matched the name itself
        if (a.nameMatches !== b.nameMatches) return b.nameMatches - a.nameMatches;

        const aExact = a.entry.name.toLowerCase() === queryLower ? 0 : 1;
        const bExact = b.entry.name.toLowerCase() === queryLower ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;

        const aExported = a.entry.isExported ? 0 : 1;
        const bExported = b.entry.isExported ? 0 : 1;
        if (aExported !== bExported) return aExported - bExported;

        return a.entry.name.localeCompare(b.entry.name);
    });

    return scored.slice(0, limit).map(s => s.entry);
}

/**
 * Search the member index by query string.
 *
 * Supports case-insensitive matching against the combined owner class name, member name,
 * and member JSDoc. Multi-word queries are split into tokens - all tokens must match (AND
 * logic) against the combined text. This allows queries like "StoreRecord raw" to find
 * the `raw` property on `StoreRecord`. Results are scored: member-name matches rank above
 * owner/JSDoc-only matches. Searches members of every exported class and every exported
 * `*Config` interface (see `shouldIndexClassMembers` / `shouldIndexInterfaceMembers`).
 */
export async function searchMembers(
    query: string,
    options?: {limit?: number}
): Promise<MemberIndexEntry[]> {
    await ensureInitialized();

    const queryLower = query.toLowerCase().trim();
    if (!queryLower) return [];

    const tokens = queryLower.split(/\s+/);
    const limit = options?.limit ?? 15;
    const scored: {entry: MemberIndexEntry; nameMatches: number}[] = [];

    for (const [key, entries] of memberIndex!) {
        for (const entry of entries) {
            const ownerLower = entry.ownerName.toLowerCase();
            const jsDocLower = entry.jsDoc?.toLowerCase() ?? '';
            const searchable = ownerLower + ' ' + key + ' ' + jsDocLower;

            if (!tokens.every(t => searchable.includes(t))) continue;

            // Count how many tokens matched the member name for ranking.
            const nameMatches = tokens.filter(t => key.includes(t)).length;
            scored.push({entry, nameMatches});
        }
    }

    // Sort: most member-name matches first, then exact name, then alpha by name, then owner.
    scored.sort((a, b) => {
        if (a.nameMatches !== b.nameMatches) return b.nameMatches - a.nameMatches;

        const aExact = a.entry.name.toLowerCase() === queryLower ? 0 : 1;
        const bExact = b.entry.name.toLowerCase() === queryLower ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;

        const nameCompare = a.entry.name.localeCompare(b.entry.name);
        if (nameCompare !== 0) return nameCompare;

        return a.entry.ownerName.localeCompare(b.entry.ownerName);
    });

    return scored.slice(0, limit).map(s => s.entry);
}

/**
 * Get detailed information about a specific symbol.
 *
 * Finds the symbol in the index by exact name match (case-sensitive).
 * If filePath is provided, filters to that specific file. If multiple matches
 * and no filePath, returns the first exported match.
 */
export async function getSymbolDetail(
    name: string,
    filePath?: string
): Promise<SymbolDetail | null> {
    await ensureInitialized();

    const entry = findIndexEntry(name, filePath);
    if (!entry) return null;

    try {
        return extractSymbolDetail(entry);
    } catch (e) {
        log.warn(`Failed to extract detail for symbol "${name}": ${e}`);
        return null;
    }
}

/**
 * Find companion symbols for cross-referencing in detail output.
 *
 * For a Props interface (e.g. `PanelProps`), returns the companion component
 * consts (`Panel`, `panel`) from the same file. For a component const, returns
 * the companion Props interface. Returns an empty array if no companions found.
 */
export async function getCompanionSymbols(entry: SymbolEntry): Promise<SymbolEntry[]> {
    await ensureInitialized();

    if (entry.kind === 'interface' && entry.name.endsWith('Props')) {
        // Props interface → look for companion component consts
        const baseName = entry.name.slice(0, -5);
        if (!baseName) return [];
        return findCompanionEntries(baseName, entry.filePath);
    }

    if (entry.kind === 'const') {
        // Component const → look for companion Props interface
        const pascalName = entry.name[0].toUpperCase() + entry.name.slice(1) + 'Props';
        const key = pascalName.toLowerCase();
        const entries = symbolIndex!.get(key);
        if (!entries) return [];
        return entries.filter(
            e => e.name === pascalName && e.kind === 'interface' && e.filePath === entry.filePath
        );
    }

    return [];
}

/** Find companion const entries (PascalCase and camelCase) in the same file. */
function findCompanionEntries(baseName: string, filePath: string): SymbolEntry[] {
    const results: SymbolEntry[] = [];
    const camelName = baseName[0].toLowerCase() + baseName.slice(1);

    for (const name of [baseName, camelName]) {
        const key = name.toLowerCase();
        const entries = symbolIndex!.get(key);
        if (!entries) continue;
        for (const e of entries) {
            if (e.name === name && e.kind === 'const' && e.filePath === filePath) {
                results.push(e);
            }
        }
    }
    return results;
}

/**
 * Get members (properties, methods, accessors) of a class or interface.
 *
 * For classes, walks the inheritance chain and includes inherited members tagged
 * with their declaring class. Filters out `_`-prefixed and `private` members to
 * match the member index behavior.
 *
 * Returns null for symbol kinds other than class or interface.
 */
export async function getMembers(
    name: string,
    filePath?: string
): Promise<{symbol: SymbolDetail; members: MemberInfo[]} | null> {
    await ensureInitialized();

    const entry = findIndexEntry(name, filePath);
    if (!entry) return null;
    if (entry.kind !== 'class' && entry.kind !== 'interface') return null;

    try {
        const detail = extractSymbolDetail(entry);
        if (!detail) return null;

        let members: MemberInfo[];
        if (entry.kind === 'class') {
            members = extractClassMembersWithInheritance(entry.filePath, name);
        } else {
            members = extractInterfaceMembersWithInheritance(entry.filePath, name);
        }

        // Filter out _-prefixed and private members (match member index behavior)
        members = members.filter(m => !m.name.startsWith('_'));

        return {symbol: detail, members};
    } catch (e) {
        log.warn(`Failed to extract members for symbol "${name}": ${e}`);
        return null;
    }
}

//------------------------------------------------------------------
// Internal helpers for detail extraction
//------------------------------------------------------------------

/**
 * Walk the inheritance chain of a class and collect members from each level.
 * Members from the target class itself have no `inheritedFrom` tag; members
 * from ancestor classes are tagged with the declaring class name.
 *
 * Deduplicates by member name — if a subclass overrides a parent member, only
 * the subclass version is included.
 */
function extractClassMembersWithInheritance(filePath: string, name: string): MemberInfo[] {
    const allMembers: MemberInfo[] = [];
    const seen = new Set<string>();

    let currentFilePath: string | undefined = filePath;
    let currentName: string | undefined = name;
    let isFirst = true;

    while (currentFilePath && currentName) {
        const sourceFile = project!.getSourceFile(currentFilePath);
        if (!sourceFile) break;

        const cls = sourceFile.getClass(currentName);
        if (!cls) break;

        const members = extractClassMembers(sourceFile, currentName);
        const inheritedFrom = isFirst ? undefined : currentName;

        for (const m of members) {
            // Skip private members at this level
            if (isPrivateMember(m, cls)) continue;

            // Deduplicate: subclass overrides win
            const key = `${m.isStatic ? 'static:' : ''}${m.name}`;
            if (seen.has(key)) continue;
            seen.add(key);

            allMembers.push({...m, inheritedFrom});
        }

        // Walk up to the parent class
        isFirst = false;
        const extendsExpr = cls.getExtends();
        if (!extendsExpr) break;

        // Resolve the base class name (strip type parameters)
        const baseClassName = extendsExpr.getExpression().getText();
        const baseEntry = findIndexEntry(baseClassName);
        if (!baseEntry || baseEntry.kind !== 'class') break;

        currentFilePath = baseEntry.filePath;
        currentName = baseEntry.name;
    }

    return allMembers;
}

/**
 * Walk the inheritance chain of an interface and collect members from each level.
 * Uses BFS to handle multiple parent interfaces (interfaces support multiple extends).
 * Members from the target interface itself have no `inheritedFrom` tag; members
 * from ancestor interfaces are tagged with the declaring interface name.
 *
 * Deduplicates by member name — first occurrence wins (root › first parent › ...).
 * Parents not found in our symbol index (e.g. React's HTMLAttributes) are skipped.
 */
function extractInterfaceMembersWithInheritance(filePath: string, name: string): MemberInfo[] {
    const allMembers: MemberInfo[] = [];
    const seen = new Set<string>();
    const visited = new Set<string>();

    const queue: Array<{filePath: string; name: string; isRoot: boolean}> = [
        {filePath, name, isRoot: true}
    ];

    while (queue.length > 0) {
        const current = queue.shift()!;
        const visitKey = `${current.filePath}:${current.name}`;
        if (visited.has(visitKey)) continue;
        visited.add(visitKey);

        const sourceFile = project!.getSourceFile(current.filePath);
        if (!sourceFile) continue;

        const iface = sourceFile.getInterface(current.name);
        if (!iface) continue;

        const members = extractInterfaceMembers(sourceFile, current.name);
        const inheritedFrom = current.isRoot ? undefined : current.name;

        for (const m of members) {
            const key = `${m.isStatic ? 'static:' : ''}${m.name}`;
            if (seen.has(key)) continue;
            seen.add(key);
            allMembers.push({...m, inheritedFrom});
        }

        // Enqueue all parent interfaces from extends clauses
        for (const extendsExpr of iface.getExtends()) {
            const parentName = extendsExpr.getExpression().getText();
            const parentEntry = findIndexEntry(parentName);
            if (!parentEntry || parentEntry.kind !== 'interface') continue;
            queue.push({filePath: parentEntry.filePath, name: parentEntry.name, isRoot: false});
        }
    }

    return allMembers;
}

/**
 * Find other exported symbols with the same name as the given entry, excluding
 * dynamics stubs. Used to surface disambiguation hints when multiple real symbols
 * share a name (e.g. `View` in both `cmp/viewmanager` and `data/cube`).
 */
export function findAlternateEntries(name: string, selectedFilePath: string): SymbolEntry[] {
    const key = name.toLowerCase();
    const entries = symbolIndex!.get(key);
    if (!entries) return [];
    return entries.filter(
        e =>
            e.name === name &&
            e.isExported &&
            e.filePath !== selectedFilePath &&
            !e.sourcePackage.startsWith('dynamics')
    );
}

/**
 * Find a symbol in the index by exact name.
 * Prefers exported symbols when multiple matches exist and no filePath filter.
 */
function findIndexEntry(name: string, filePath?: string): SymbolEntry | null {
    const key = name.toLowerCase();
    const entries = symbolIndex!.get(key);
    if (!entries) return null;

    // Exact name match (case-sensitive)
    const exact = entries.filter(e => e.name === name);
    if (exact.length === 0) return null;

    if (filePath) {
        // Resolve relative paths against repo root -- search results display repo-relative
        // paths, so callers will typically pass those rather than absolute paths.
        const resolved = filePath.startsWith('/') ? filePath : resolve(resolveRepoRoot(), filePath);
        return exact.find(e => e.filePath === resolved) ?? null;
    }

    // Prefer exported symbols, and among those prefer class/interface over const/type stubs
    // (e.g. dynamics/desktop.ts re-exports `export let Foo = null` alongside the real class).
    const exported = exact.filter(e => e.isExported);
    if (exported.length > 1) {
        const preferred = exported.find(e => e.kind === 'class' || e.kind === 'interface');
        if (preferred) return preferred;
    }
    return exported[0] ?? exact[0];
}

/**
 * Extract detailed information from a symbol's AST node.
 */
function extractSymbolDetail(entry: SymbolEntry): SymbolDetail | null {
    // Promise extensions are pre-computed since they live inside `declare global`
    // and can't be found by standard sourceFile.getFunction() lookup.
    const precomputed = promiseExtensionDetails?.get(entry.name);
    if (precomputed && entry.filePath === precomputed.filePath) return precomputed;

    const sourceFile = project!.getSourceFile(entry.filePath);
    if (!sourceFile) return null;

    const base: Omit<SymbolDetail, 'signature' | 'jsDoc'> = {
        name: entry.name,
        kind: entry.kind,
        filePath: entry.filePath,
        sourcePackage: entry.sourcePackage,
        isExported: entry.isExported
    };

    switch (entry.kind) {
        case 'class':
            return extractClassDetail(sourceFile, entry.name, base);
        case 'interface':
            return extractInterfaceDetail(sourceFile, entry.name, base);
        case 'type':
            return extractTypeAliasDetail(sourceFile, entry.name, base);
        case 'function':
            return extractFunctionDetail(sourceFile, entry.name, base);
        case 'enum':
            return extractEnumDetail(sourceFile, entry.name, base);
        case 'const':
            return extractConstDetail(sourceFile, entry.name, base);
        default:
            return null;
    }
}

/** Extract JSDoc description from a node that supports getJsDocs(). */
function extractJsDoc(node: {getJsDocs?: () => Array<{getDescription: () => string}>}): string {
    try {
        const docs = node.getJsDocs?.() ?? [];
        return docs
            .map(d => d.getDescription())
            .join('\n')
            .trim();
    } catch {
        return '';
    }
}

/**
 * Extract the `@mcpHint` tag text, if present. This is a Hoist-specific JSDoc tag
 * that framework authors can attach to a class or interface to provide a short
 * hint used in MCP search results (e.g. "model backing all grid components").
 * Collocating this with the declaration avoids the name collisions and
 * maintenance drift of a separate hand-curated lookup table.
 *
 * Returns empty string if no tag is present or the comment is empty.
 */
function extractMcpHint(node: ClassDeclaration | InterfaceDeclaration): string {
    try {
        for (const doc of node.getJsDocs() ?? []) {
            for (const tag of doc.getTags() ?? []) {
                if (tag.getTagName() !== 'mcpHint') continue;
                const text = tag.getCommentText();
                if (typeof text === 'string') return text.trim();
            }
        }
        return '';
    } catch {
        return '';
    }
}

/**
 * For a Props interface (e.g. `PanelProps`), look up the companion component's
 * JSDoc from the same file. Uses the reliable `FooProps → Foo/foo` naming
 * convention: strips the `Props` suffix and checks for a matching exported const.
 *
 * Returns the companion JSDoc string, or empty string if no match is found.
 */
function extractCompanionJsDoc(sourceFile: SourceFile, propsName: string): string {
    if (!propsName.endsWith('Props')) return '';
    const companionName = propsName.slice(0, -5);
    if (!companionName) return '';

    // Look for `const [Foo, foo] = ...` or `const foo = ...` in the same file
    const varDecl =
        sourceFile.getVariableDeclaration(companionName) ??
        sourceFile.getVariableDeclaration(companionName[0].toLowerCase() + companionName.slice(1));
    if (!varDecl) return '';

    const varStmt = varDecl.getFirstAncestorByKind(SyntaxKind.VariableStatement);
    return varStmt ? extractJsDoc(varStmt) : '';
}

/**
 * Extract JSDoc from a function, falling back to the first overload signature if the
 * implementation has no JSDoc. TypeScript best practice places JSDoc on overload signatures
 * (which are visible to consumers) rather than the implementation (which is hidden).
 */
function extractFunctionJsDoc(func: FunctionDeclaration): string {
    const implDoc = extractJsDoc(func);
    if (implDoc) return implDoc;

    const overloads = func.getOverloads();
    for (const overload of overloads) {
        const doc = extractJsDoc(overload);
        if (doc) return doc;
    }
    return '';
}

/** Safely extract a type's text representation. */
function safeGetTypeText(node: Node, enclosing?: Node): string {
    try {
        const type = node.getType();
        return type.getText(enclosing ?? node);
    } catch {
        return 'unknown';
    }
}

/**
 * Fast type-text extraction that avoids TypeScript's type checker for the common
 * case of an explicit annotation. Returns the annotated type as written (e.g.
 * `GridGroupSortFn`, `string | null`) via ts-morph's syntactic `getTypeNode()` path.
 * Falls back to `safeGetTypeText` when the declaration has no explicit annotation
 * (e.g. an inferred property type). Roughly an order of magnitude cheaper than
 * `safeGetTypeText` because it skips cross-file type resolution.
 */
function fastGetTypeText(node: Node, enclosing?: Node): string {
    try {
        const typed = node as unknown as {getTypeNode?: () => Node | undefined};
        const tn = typed.getTypeNode?.();
        if (tn) return tn.getText().trim();
    } catch {
        // fall through
    }
    return safeGetTypeText(node, enclosing);
}

/**
 * Extract the class declaration header (everything up to the opening brace).
 */
function extractClassSignature(cls: ClassDeclaration): string {
    const text = cls.getText();
    const braceIdx = text.indexOf('{');
    if (braceIdx === -1) return text.trim();
    return text.slice(0, braceIdx).trim();
}

function extractClassDetail(
    sourceFile: SourceFile,
    name: string,
    base: Omit<SymbolDetail, 'signature' | 'jsDoc'>
): SymbolDetail | null {
    const cls = sourceFile.getClass(name);
    if (!cls) return null;

    const extendsClause = cls.getExtends()?.getText();
    const implementsClauses = cls.getImplements().map(i => i.getText());
    const decorators = cls.getDecorators().map(d => d.getName());

    // Detect constructor config type (e.g. `constructor(config: GridConfig)`)
    let constructorType: string | undefined;
    const ctors = cls.getConstructors();
    if (ctors.length > 0) {
        const params = ctors[0].getParameters();
        if (params.length === 1) {
            const paramType = params[0].getTypeNode()?.getText();
            if (paramType) constructorType = paramType;
        }
    }

    return {
        ...base,
        signature: extractClassSignature(cls),
        jsDoc: extractJsDoc(cls),
        ...(extendsClause ? {extends: extendsClause} : {}),
        ...(implementsClauses.length > 0 ? {implements: implementsClauses} : {}),
        ...(decorators.length > 0 ? {decorators} : {}),
        ...(constructorType ? {constructorType} : {})
    };
}

function extractInterfaceDetail(
    sourceFile: SourceFile,
    name: string,
    base: Omit<SymbolDetail, 'signature' | 'jsDoc'>
): SymbolDetail | null {
    const iface = sourceFile.getInterface(name);
    if (!iface) return null;

    const extendsClauses = iface.getExtends().map(e => e.getText());
    const text = iface.getText();
    const braceIdx = text.indexOf('{');
    const signature = braceIdx === -1 ? text.trim() : text.slice(0, braceIdx).trim();

    // For Props interfaces without their own JSDoc, inherit from the companion component
    let jsDoc = extractJsDoc(iface);
    if (!jsDoc) jsDoc = extractCompanionJsDoc(sourceFile, name);

    return {
        ...base,
        signature,
        jsDoc,
        ...(extendsClauses.length > 0 ? {extends: extendsClauses.join(', ')} : {})
    };
}

function extractTypeAliasDetail(
    sourceFile: SourceFile,
    name: string,
    base: Omit<SymbolDetail, 'signature' | 'jsDoc'>
): SymbolDetail | null {
    const typeAlias = sourceFile.getTypeAlias(name);
    if (!typeAlias) return null;

    return {
        ...base,
        signature: typeAlias.getText().trim(),
        jsDoc: extractJsDoc(typeAlias)
    };
}

function extractFunctionDetail(
    sourceFile: SourceFile,
    name: string,
    base: Omit<SymbolDetail, 'signature' | 'jsDoc'>
): SymbolDetail | null {
    const func = sourceFile.getFunction(name);
    if (!func) return null;

    // Build signature from parameters and return type (without the body)
    const params = func
        .getParameters()
        .map(p => {
            const pName = p.getName();
            const pType = safeGetTypeText(p);
            const optional = p.hasQuestionToken() ? '?' : '';
            return `${pName}${optional}: ${pType}`;
        })
        .join(', ');

    let returnType: string;
    try {
        returnType = func.getReturnType().getText(func);
    } catch {
        returnType = 'unknown';
    }

    const exportPrefix = func.isExported() ? 'export ' : '';
    const asyncPrefix = func.isAsync() ? 'async ' : '';
    const typeParams = func.getTypeParameters();
    const typeParamStr =
        typeParams.length > 0 ? `<${typeParams.map(tp => tp.getText()).join(', ')}>` : '';

    const signature = `${exportPrefix}${asyncPrefix}function ${name}${typeParamStr}(${params}): ${returnType}`;

    return {
        ...base,
        signature,
        jsDoc: extractFunctionJsDoc(func)
    };
}

function extractEnumDetail(
    sourceFile: SourceFile,
    name: string,
    base: Omit<SymbolDetail, 'signature' | 'jsDoc'>
): SymbolDetail | null {
    const enumDecl = sourceFile.getEnum(name);
    if (!enumDecl) return null;

    return {
        ...base,
        signature: enumDecl.getText().trim(),
        jsDoc: extractJsDoc(enumDecl)
    };
}

function extractConstDetail(
    sourceFile: SourceFile,
    name: string,
    base: Omit<SymbolDetail, 'signature' | 'jsDoc'>
): SymbolDetail | null {
    const varDecl = sourceFile.getVariableDeclaration(name);
    if (!varDecl) return null;

    // Get the variable statement for JSDoc (JSDoc is on the statement, not the declaration)
    const varStmt = varDecl.getFirstAncestorByKind(SyntaxKind.VariableStatement);

    const declText = varDecl.getText().trim();
    const exportPrefix = varStmt?.isExported() ? 'export const ' : 'const ';
    const signature = `${exportPrefix}${declText}`;

    return {
        ...base,
        signature: signature.length > 500 ? signature.slice(0, 500) + '...' : signature,
        jsDoc: varStmt ? extractJsDoc(varStmt) : ''
    };
}

//------------------------------------------------------------------
// Member extraction
//------------------------------------------------------------------

/**
 * Extract all members from a class declaration.
 */
function extractClassMembers(sourceFile: SourceFile, name: string): MemberInfo[] {
    const cls = sourceFile.getClass(name);
    if (!cls) return [];

    const members: MemberInfo[] = [];

    // Instance properties
    for (const prop of cls.getInstanceProperties()) {
        try {
            const propName = prop.getName();
            if (!propName) continue;

            const isAccessor = Node.isGetAccessorDeclaration(prop);
            const decorators = getNodeDecorators(prop);

            members.push({
                name: propName,
                kind: isAccessor ? 'accessor' : 'property',
                type: fastGetTypeText(prop, prop),
                isStatic: false,
                isOptional: Node.isPropertyDeclaration(prop) ? prop.hasQuestionToken() : undefined,
                decorators,
                jsDoc: extractJsDoc(prop as Parameters<typeof extractJsDoc>[0])
            });
        } catch (e) {
            log.warn(`Failed to extract instance property from ${name}: ${e}`);
        }
    }

    // Static properties
    for (const prop of cls.getStaticProperties()) {
        try {
            const propName = prop.getName();
            if (!propName) continue;

            const isAccessor = Node.isGetAccessorDeclaration(prop);
            const decorators = getNodeDecorators(prop);

            members.push({
                name: propName,
                kind: isAccessor ? 'accessor' : 'property',
                type: fastGetTypeText(prop, prop),
                isStatic: true,
                decorators,
                jsDoc: extractJsDoc(prop as Parameters<typeof extractJsDoc>[0])
            });
        } catch (e) {
            log.warn(`Failed to extract static property from ${name}: ${e}`);
        }
    }

    // Instance methods
    for (const method of cls.getInstanceMethods()) {
        try {
            members.push(extractMethodInfo(method, false));
        } catch (e) {
            log.warn(`Failed to extract instance method from ${name}: ${e}`);
        }
    }

    // Static methods
    for (const method of cls.getStaticMethods()) {
        try {
            members.push(extractMethodInfo(method, true));
        } catch (e) {
            log.warn(`Failed to extract static method from ${name}: ${e}`);
        }
    }

    return members;
}

/**
 * Extract all members from an interface declaration.
 */
function extractInterfaceMembers(sourceFile: SourceFile, name: string): MemberInfo[] {
    const iface = sourceFile.getInterface(name);
    if (!iface) return [];

    const members: MemberInfo[] = [];

    // Properties
    for (const prop of iface.getProperties()) {
        try {
            members.push({
                name: prop.getName(),
                kind: 'property',
                type: fastGetTypeText(prop, prop),
                isStatic: false,
                isOptional: prop.hasQuestionToken(),
                decorators: [],
                jsDoc: extractJsDoc(prop)
            });
        } catch (e) {
            log.warn(`Failed to extract interface property from ${name}: ${e}`);
        }
    }

    // Methods
    for (const method of iface.getMethods()) {
        try {
            const params = method.getParameters().map(p => ({
                name: p.getName(),
                type: fastGetTypeText(p, p)
            }));

            // Prefer the declared return-type annotation (cheap AST lookup) and only
            // fall through to the checker's `getReturnType()` when unavailable.
            const retNode = method.getReturnTypeNode();
            let returnType: string;
            if (retNode) {
                returnType = retNode.getText().trim();
            } else {
                try {
                    returnType = method.getReturnType().getText(method);
                } catch {
                    returnType = 'unknown';
                }
            }

            members.push({
                name: method.getName(),
                kind: 'method',
                type: returnType,
                isStatic: false,
                decorators: [],
                jsDoc: extractJsDoc(method),
                parameters: params,
                returnType
            });
        } catch (e) {
            log.warn(`Failed to extract interface method from ${name}: ${e}`);
        }
    }

    return members;
}

/** Extract method info from a class method declaration. */
function extractMethodInfo(
    method: ReturnType<ClassDeclaration['getInstanceMethods']>[number],
    isStatic: boolean
): MemberInfo {
    const params = method.getParameters().map(p => ({
        name: p.getName(),
        type: fastGetTypeText(p, p)
    }));

    // Prefer the declared return-type annotation. Falling back to the checker's
    // `getReturnType()` is ~order-of-magnitude slower and drives most of the
    // index-build cost when many classes are indexed.
    const retNode = method.getReturnTypeNode();
    let returnType: string;
    if (retNode) {
        returnType = retNode.getText().trim();
    } else {
        try {
            returnType = method.getReturnType().getText(method);
        } catch {
            returnType = 'unknown';
        }
    }

    return {
        name: method.getName(),
        kind: 'method',
        type: returnType,
        isStatic,
        decorators: getNodeDecorators(method),
        jsDoc: extractJsDoc(method),
        parameters: params,
        returnType
    };
}

/** Safely get decorator names from a node (not all node types support getDecorators). */
function getNodeDecorators(node: unknown): string[] {
    try {
        const decorated = node as {getDecorators?: () => Array<{getName: () => string}>};
        return decorated.getDecorators?.()?.map(d => d.getName()) ?? [];
    } catch {
        return [];
    }
}
