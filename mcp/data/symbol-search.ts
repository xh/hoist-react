/**
 * Ranked search over the TypeScript symbol and member indexes.
 *
 * Two MiniSearch (BM25+) indexes are built in memory from the registry's symbol and member
 * maps (so the disk cache in `index-cache.ts` keeps working): symbols are indexed on name
 * (boosted), kind, package, own member names, first JSDoc sentence, and the rest of the JSDoc;
 * members on owner name and member name (boosted), type text, and JSDoc. Text processing and
 * the ranking helpers are shared with doc search - see `search-text.ts`.
 *
 * Ranking: OR combination scaled by the share of query terms matched, a bonus for a symbol or
 * member whose whole name the query spells out, a penalty for symbols no package barrel
 * re-exports (internal API) and for `kit/` re-exports of third-party components, and shorter
 * names first on ties. By default `impl/`, `admin/`, `inspector/`, and `dynamics/` code,
 * non-exported symbols, and symbols no package barrel re-exports (an app cannot import them) are
 * hidden and counted; `includeInternal` shows them. `*Props` members are indexed but only
 * returned when the query names the owner (`ButtonProps` or `button`), since generic prop names
 * would otherwise flood every query.
 */
import MiniSearch, {type SearchOptions} from 'minisearch';

import {
    createTermProcessor,
    firstSentence,
    isRedundantCompoundMatch,
    queryTerms,
    rankByCoverage,
    splitSummary,
    tokenize
} from './search-text.js';
import {
    getIndexes,
    isPromiseExtension,
    isPropsOwner,
    type MemberIndexEntry,
    type SymbolEntry,
    type SymbolKind
} from './ts-registry.js';
import {resolveRepoRootPosix} from '../util/paths.js';

//------------------------------------------------------------------
// Types
//------------------------------------------------------------------

/** Options for {@link searchSymbols}. */
export interface SymbolSearchOptions {
    /** Restrict symbol results to one kind. Member results are unaffected. */
    kind?: SymbolKind;
    /** Exported symbols only. Default: true, or false when `includeInternal` is set. */
    exported?: boolean;
    /**
     * Include `impl/`, `admin/`, `inspector/`, `dynamics/` code, non-exported symbols, and
     * symbols no package barrel re-exports.
     */
    includeInternal?: boolean;
    /** Maximum symbol results and maximum member results. Clamped to 1-{@link MAX_SEARCH_LIMIT}. */
    limit?: number;
}

export interface SymbolHit {
    entry: SymbolEntry;
    /** Relevance score. Comparable only within one result set. */
    score: number;
    /** First JSDoc sentence, cut at about {@link SUMMARY_CHARS} characters. */
    summary: string;
    /** True for classes and interfaces - the targets `hoist-get-members` accepts. */
    hasMembers: boolean;
    /**
     * Element factory paired with this component (`button` for `Button`). Hoist exports
     * components as `[Button, button]`; both index separately but search shows them as one hit.
     */
    factory?: string;
    /** Props interface of this component (`ButtonProps`), folded into the component's hit. */
    props?: string;
}

export interface MemberHit {
    entry: MemberIndexEntry;
    score: number;
    summary: string;
    /** Public import path of the owner, or null. */
    importPath: string | null;
}

export interface SymbolSearchResults {
    query: string;
    symbols: SymbolHit[];
    members: MemberHit[];
    /** Matching symbols before `limit` was applied. */
    symbolTotal: number;
    memberTotal: number;
    /** Matching internal symbols left out because `includeInternal` was not set. */
    hiddenSymbols: number;
    hiddenMembers: number;
    /**
     * Hidden symbols whose whole name the query spells out (`CardModel`), so an agent that
     * typed the exact name of an un-importable symbol is told where it is, not just counted.
     */
    hiddenExact: SymbolEntry[];
}

export const DEFAULT_SEARCH_LIMIT = 8,
    MAX_SEARCH_LIMIT = 20;

//------------------------------------------------------------------
// Tuning
//------------------------------------------------------------------

/** Cut for the one-line summary shown per symbol hit. */
export const SUMMARY_CHARS = 80;

/** Cut for the one-line summary shown per member hit - the same cut member listings use. */
export const MEMBER_SUMMARY_CHARS = 90;

const SYMBOL_BOOST = {name: 4, kind: 0.3, package: 0.5, members: 1, summary: 1.5, body: 0.4},
    MEMBER_BOOST = {owner: 2, name: 4, type: 0.3, summary: 1.5, body: 0.4};

/**
 * Multiplier for a symbol or member whose whole name the query spells out (`Select`,
 * `GridModel`). Applied to the raw BM25 score instead of the coverage-scaled one: a query that
 * names a symbol has found it, however many other terms it carries.
 */
const EXACT_NAME_BOOST = 2.5;

/** Extra multiplier for a member hit whose owner the query also names (`StoreRecord raw`). */
const OWNER_NAMED_BOOST = 1.3;

/** Multiplier for symbols no barrel re-exports - reachable, but not the public API. */
const INTERNAL_WEIGHT = 0.5;

/** Multiplier for `kit/` re-exports of third-party components (Blueprint, Onsen), which are not Hoist APIs. */
const KIT_WEIGHT = 0.5;

/** Multiplier for a member whose JSDoc is inherited, so the documenting declaration ranks first. */
const INHERITED_DOC_WEIGHT = 0.98;

/** Top-level directories and path segments treated as internal unless `includeInternal` is set. */
const INTERNAL_TOP_DIRS = new Set(['admin', 'inspector', 'dynamics']),
    INTERNAL_SEGMENT = 'impl';

//------------------------------------------------------------------
// Public API
//------------------------------------------------------------------

/** Ranked symbol and member search. Both lists are empty for a query of stop words only. */
export async function searchSymbols(
    query: string,
    options: SymbolSearchOptions = {}
): Promise<SymbolSearchResults> {
    const terms = queryTerms(query),
        empty = {
            query,
            symbols: [],
            members: [],
            symbolTotal: 0,
            memberTotal: 0,
            hiddenSymbols: 0,
            hiddenMembers: 0,
            hiddenExact: []
        };
    if (terms.length === 0) return empty;

    const idx = await getSearchIndex(),
        limit = Math.min(Math.max(options.limit ?? DEFAULT_SEARCH_LIMIT, 1), MAX_SEARCH_LIMIT),
        includeInternal = options.includeInternal === true,
        exportedOnly = options.exported ?? !includeInternal,
        querySet = new Set(terms),
        // Whole names the query spells out: each raw token, and all tokens run together.
        named = new Set([
            ...tokenize(query).map(t => t.toLowerCase()),
            tokenize(query).join('').toLowerCase()
        ]),
        q = terms.join(' '),
        baseOpts = (compoundHeads: Map<string, string>): SearchOptions => ({
            combineWith: 'OR',
            prefix: term => term.length >= 3,
            // No fuzzy matching: API names are exact, camelCase parts and prefixes already give
            // recall for near misses, and fuzzy pulled "current" hits into "currency".
            fuzzy: false,
            tokenize: s => s.split(' '),
            processTerm: t => t,
            boostDocument: (_id, term) =>
                isRedundantCompoundMatch(compoundHeads, term, terms, querySet) ? 0 : 1
        });

    // Internal hits are ranked with the rest, then set aside and counted unless requested, so
    // the footer can say how many `includeInternal` would add.
    const allSymbolHits = rankByCoverage(
        idx.symbols.search(q, {
            ...baseOpts(idx.symbolHeads),
            boost: SYMBOL_BOOST,
            filter: hit => {
                const e = idx.symbolEntries[hit.id];
                return (
                    (!options.kind || e.kind === options.kind) && (!exportedOnly || e.isExported)
                );
            }
        }),
        terms.length
    ).map(({hit, score}) => {
        const entry = idx.symbolEntries[hit.id],
            exact = named.has(entry.name.toLowerCase()),
            weight = symbolWeight(entry.importPath);
        return {entry, score: exact ? hit.score * EXACT_NAME_BOOST * weight : score * weight};
    });
    const symbolHits = includeInternal
            ? allSymbolHits
            : allSymbolHits.filter(h => !isInternalSymbol(h.entry, idx.root)),
        hiddenExact = includeInternal
            ? []
            : allSymbolHits
                  .filter(
                      h =>
                          isInternalSymbol(h.entry, idx.root) &&
                          named.has(h.entry.name.toLowerCase())
                  )
                  .map(h => h.entry);
    symbolHits.sort((a, b) => b.score - a.score || a.entry.name.length - b.entry.name.length);
    const symbolResults = mergeComponentHits(symbolHits);

    const allMemberHits = rankByCoverage(
        idx.members.search(q, {
            ...baseOpts(idx.memberHeads),
            boost: MEMBER_BOOST,
            filter: hit => {
                const m = idx.memberEntries[hit.id];
                if (!isPropsOwner(m.ownerName)) return true;
                const owner = m.ownerName.toLowerCase();
                return named.has(owner) || named.has(owner.slice(0, -'props'.length));
            }
        }),
        terms.length
    ).map(({hit, score}) => {
        const entry = idx.memberEntries[hit.id],
            importPath = idx.ownerImportPaths.get(ownerKey(entry)) ?? null,
            exact = named.has(entry.name.toLowerCase());
        let s = (exact ? hit.score * EXACT_NAME_BOOST : score) * symbolWeight(importPath);
        if (exact && named.has(entry.ownerName.toLowerCase())) s *= OWNER_NAMED_BOOST;
        if (entry.jsDocInheritedFrom) s *= INHERITED_DOC_WEIGHT;
        return {entry, score: s, importPath};
    });
    const memberHits = dedupeMemberHits(
        includeInternal
            ? allMemberHits
            : allMemberHits.filter(h => !isInternalMember(h.entry, h.importPath, idx.root))
    );
    // Ties (`GridConfig.sortBy` and `ZoneGridConfig.sortBy` share docs) go to the shorter owner
    // name, which tends to be the more general type.
    memberHits.sort(
        (a, b) =>
            b.score - a.score ||
            a.entry.ownerName.length - b.entry.ownerName.length ||
            a.entry.name.length - b.entry.name.length
    );

    return {
        query,
        symbols: symbolResults.slice(0, limit).map(({entry, score, factory, props}) => ({
            entry,
            score,
            summary: firstSentence(entry.jsDoc, SUMMARY_CHARS),
            hasMembers: entry.kind === 'class' || entry.kind === 'interface',
            ...(factory ? {factory} : {}),
            ...(props ? {props} : {})
        })),
        members: memberHits.slice(0, limit).map(({entry, score, importPath}) => ({
            entry,
            score,
            summary: firstSentence(entry.jsDoc, MEMBER_SUMMARY_CHARS),
            importPath
        })),
        symbolTotal: symbolResults.length,
        memberTotal: memberHits.length,
        hiddenSymbols: allSymbolHits.length - symbolHits.length,
        hiddenMembers: allMemberHits.length - memberHits.length,
        hiddenExact
    };
}

/**
 * Drop member hits that repeat an earlier hit's owner name, member name, and type - the desktop
 * and mobile `SelectProps.options` read identically, and a member line shows no import path.
 */
function dedupeMemberHits<T extends {entry: MemberIndexEntry}>(hits: T[]): T[] {
    const seen = new Set<string>();
    return hits.filter(h => {
        const key = `${h.entry.ownerName}.${h.entry.name}:${h.entry.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/** Internal unless `includeInternal`: an internal path, or nothing an app can import. */
function isInternalSymbol(entry: SymbolEntry, root: string): boolean {
    return (
        isInternalPath(entry.filePath, root) ||
        (entry.importPath == null && !isPromiseExtension(entry))
    );
}

/** As {@link isInternalSymbol}, for a member via its owner's import path. `Promise` members need no import. */
function isInternalMember(
    m: MemberIndexEntry,
    ownerImportPath: string | null,
    root: string
): boolean {
    return (
        isInternalPath(m.filePath, root) || (ownerImportPath == null && m.ownerName !== 'Promise')
    );
}

/**
 * Collapse the hits for one component into one: the component itself, its element factory
 * (`Button` and `button`, exported together from one file), and its Props interface
 * (`ButtonProps`, declared in the same file). The merged hit keeps the best position and score
 * and is labeled by the component, with `factory` and `props` recorded alongside.
 */
function mergeComponentHits(
    hits: Array<{entry: SymbolEntry; score: number}>
): Array<{entry: SymbolEntry; score: number; factory?: string; props?: string}> {
    type Merged = {entry: SymbolEntry; score: number; factory?: string; props?: string};
    const groups = new Map<string, Merged>(),
        merged: Merged[] = [],
        role = (e: SymbolEntry): 'component' | 'factory' | 'props' | null => {
            if (e.kind === 'const') return /^[A-Z]/.test(e.name) ? 'component' : 'factory';
            if (e.kind === 'interface' && e.name.endsWith('Props') && e.name.length > 5) {
                return 'props';
            }
            return null;
        },
        // Group key: file plus the camelCase base name (`button` for Button, button, ButtonProps).
        keyOf = (e: SymbolEntry, r: 'component' | 'factory' | 'props') => {
            const base = r === 'props' ? e.name.slice(0, -'Props'.length) : e.name;
            return `${e.filePath}|${base[0].toLowerCase()}${base.slice(1)}`;
        };

    for (const hit of hits) {
        const r = role(hit.entry);
        if (!r) {
            merged.push(hit);
            continue;
        }
        const key = keyOf(hit.entry, r),
            group = groups.get(key);
        if (!group) {
            const it: Merged = {...hit};
            groups.set(key, it);
            merged.push(it);
            continue;
        }
        const current = role(group.entry)!;
        if (r === current) continue;
        if (r === 'props') group.props = hit.entry.name;
        else if (r === 'factory') group.factory = hit.entry.name;
        // A component outranks a factory or Props interface as the group's label.
        if (r === 'component' || (r === 'factory' && current === 'props')) {
            if (current === 'props') group.props = group.entry.name;
            else if (current === 'factory') group.factory = group.entry.name;
            group.entry = hit.entry;
        }
    }
    return merged;
}

/** Ranking weight from a symbol's public import path: internal and kit re-exports rank below Hoist's own API. */
function symbolWeight(importPath: string | null): number {
    if (!importPath) return INTERNAL_WEIGHT;
    return importPath.startsWith('@xh/hoist/kit/') ? KIT_WEIGHT : 1;
}

/** True for paths under `impl/` at any depth, or under a top-level internal package. */
export function isInternalPath(filePath: string, root: string = resolveRepoRootPosix()): boolean {
    const rel = filePath.startsWith(root + '/') ? filePath.slice(root.length + 1) : filePath,
        dirs = rel.split('/').slice(0, -1);
    return INTERNAL_TOP_DIRS.has(dirs[0]) || dirs.includes(INTERNAL_SEGMENT);
}

//------------------------------------------------------------------
// Index
//------------------------------------------------------------------

interface IndexedSymbol {
    id: number;
    name: string;
    kind: string;
    package: string;
    members: string;
    summary: string;
    body: string;
}

interface IndexedMember {
    id: number;
    owner: string;
    name: string;
    type: string;
    summary: string;
    body: string;
}

interface SearchIndex {
    root: string;
    symbols: MiniSearch<IndexedSymbol>;
    symbolEntries: SymbolEntry[];
    symbolHeads: Map<string, string>;
    members: MiniSearch<IndexedMember>;
    memberEntries: MemberIndexEntry[];
    memberHeads: Map<string, string>;
    /** Owner import path by `name|filePath`, for member hits. */
    ownerImportPaths: Map<string, string | null>;
}

const INDEX_CACHE = new WeakMap<Map<string, SymbolEntry[]>, SearchIndex>();

function ownerKey(m: MemberIndexEntry): string {
    return `${m.ownerName}|${m.filePath}`;
}

/** Build (or fetch the memoized) search index over the registry's current symbol and member maps. */
async function getSearchIndex(): Promise<SearchIndex> {
    const {symbols, members} = await getIndexes(),
        cached = INDEX_CACHE.get(symbols);
    if (cached) return cached;

    const symbolProcessor = createTermProcessor(),
        symbolSearch = new MiniSearch<IndexedSymbol>({
            fields: ['name', 'kind', 'package', 'members', 'summary', 'body'],
            tokenize,
            processTerm: symbolProcessor.processTerm
        }),
        symbolEntries: SymbolEntry[] = [],
        symbolDocs: IndexedSymbol[] = [],
        ownerImportPaths = new Map<string, string | null>();

    for (const entries of symbols.values()) {
        for (const entry of entries) {
            const {summary, rest} = splitSummary(entry.jsDoc),
                id = symbolEntries.length;
            symbolEntries.push(entry);
            symbolDocs.push({
                id,
                name: entry.name,
                kind: entry.kind,
                package: entry.sourcePackage,
                members: entry.memberNames ?? '',
                summary,
                body: rest
            });
            ownerImportPaths.set(`${entry.name}|${entry.filePath}`, entry.importPath);
        }
    }
    symbolSearch.addAll(symbolDocs);

    const memberProcessor = createTermProcessor(),
        memberSearch = new MiniSearch<IndexedMember>({
            fields: ['owner', 'name', 'type', 'summary', 'body'],
            tokenize,
            processTerm: memberProcessor.processTerm
        }),
        memberEntries: MemberIndexEntry[] = [],
        memberDocs: IndexedMember[] = [];

    for (const entries of members.values()) {
        for (const entry of entries) {
            const {summary, rest} = splitSummary(entry.jsDoc),
                id = memberEntries.length;
            memberEntries.push(entry);
            memberDocs.push({
                id,
                owner: entry.ownerName,
                name: entry.name,
                type: entry.type,
                summary,
                body: rest
            });
        }
    }
    memberSearch.addAll(memberDocs);

    const idx: SearchIndex = {
        root: resolveRepoRootPosix(),
        symbols: symbolSearch,
        symbolEntries,
        symbolHeads: symbolProcessor.compoundHeads,
        members: memberSearch,
        memberEntries,
        memberHeads: memberProcessor.compoundHeads,
        ownerImportPaths
    };
    INDEX_CACHE.set(symbols, idx);
    return idx;
}
