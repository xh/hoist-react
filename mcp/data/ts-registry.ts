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
import {Project, Node, SyntaxKind} from 'ts-morph';
import type {ClassDeclaration, SourceFile} from 'ts-morph';
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
 *
 * Finds the symbol in the index by exact name match (case-sensitive).
 * If filePath is provided, filters to that specific file. If multiple matches
 * and no filePath, returns the first exported match.
 */
export function getSymbolDetail(name: string, filePath?: string): SymbolDetail | null {
    ensureInitialized();

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
 * Get members (properties, methods, accessors) of a class or interface.
 *
 * Returns null for symbol kinds other than class or interface.
 */
export function getMembers(
    name: string,
    filePath?: string
): {symbol: SymbolDetail; members: MemberInfo[]} | null {
    ensureInitialized();

    const entry = findIndexEntry(name, filePath);
    if (!entry) return null;
    if (entry.kind !== 'class' && entry.kind !== 'interface') return null;

    try {
        const detail = extractSymbolDetail(entry);
        if (!detail) return null;

        const sourceFile = project!.getSourceFile(entry.filePath);
        if (!sourceFile) return null;

        let members: MemberInfo[];
        if (entry.kind === 'class') {
            members = extractClassMembers(sourceFile, name);
        } else {
            members = extractInterfaceMembers(sourceFile, name);
        }

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
        return exact.find(e => e.filePath === filePath) ?? null;
    }

    // Prefer exported symbols
    return exact.find(e => e.isExported) ?? exact[0];
}

/**
 * Extract detailed information from a symbol's AST node.
 */
function extractSymbolDetail(entry: SymbolEntry): SymbolDetail | null {
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

    return {
        ...base,
        signature: extractClassSignature(cls),
        jsDoc: extractJsDoc(cls),
        ...(extendsClause ? {extends: extendsClause} : {}),
        ...(implementsClauses.length > 0 ? {implements: implementsClauses} : {}),
        ...(decorators.length > 0 ? {decorators} : {})
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

    return {
        ...base,
        signature,
        jsDoc: extractJsDoc(iface),
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
        jsDoc: extractJsDoc(func)
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
                type: safeGetTypeText(prop, prop),
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
                type: safeGetTypeText(prop, prop),
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
                type: safeGetTypeText(prop, prop),
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
                type: safeGetTypeText(p, p)
            }));

            let returnType: string;
            try {
                returnType = method.getReturnType().getText(method);
            } catch {
                returnType = 'unknown';
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
        type: safeGetTypeText(p, p)
    }));

    let returnType: string;
    try {
        returnType = method.getReturnType().getText(method);
    } catch {
        returnType = 'unknown';
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
