/**
 * Tolerant document ID resolver for hoist-react MCP tooling.
 *
 * Accepts shortened or slightly-off doc IDs that agents naturally try (e.g. `grid`,
 * `core`, `cmp/grid`, `v85`) and resolves them to the canonical registry id when
 * the mapping is unambiguous. Strict on ambiguity: when a shortening could mean
 * multiple docs, the resolver fails closed with candidate suggestions rather than
 * guessing.
 *
 * Three invariants:
 *   1. Canonical exact match always wins (Tier 0 before any transformation).
 *   2. Every accepted shortening is derivable from a deterministic rule - no
 *      Levenshtein or probabilistic ranking at the resolution layer.
 *   3. Ambiguity surfaces. Auto-aliases that map to more than one entry are discarded.
 *
 * See the `resolveDocId` JSDoc below for the full tier ordering and rationale.
 */
import {log} from '../util/logger.js';
import type {DocEntry} from './doc-registry.js';

//------------------------------------------------------------------
// Types
//------------------------------------------------------------------

/**
 * Outcome of a doc ID resolution attempt.
 *
 * The `matchedAs` field on `normalized` results carries the caller's original
 * input. `hoist-read-doc` (tools/docs.ts) forwards it into its structured
 * `matchedAs` output field, and the CLI prints it to stderr; the resource
 * surface ignores it and treats exact and normalized results identically.
 */
export type ResolveResult =
    | {kind: 'exact'; entry: DocEntry}
    | {kind: 'normalized'; entry: DocEntry; matchedAs: string}
    | {kind: 'unknown'; input: string; suggestions: string[]};

/** Per-registry resolver state: alias map + id list for suggestion ranking. */
export interface ResolverIndex {
    /** Lowercased alias → canonical id. */
    aliases: Map<string, string>;
    /** All canonical ids, retained for substring suggestion ranking. */
    allIds: string[];
}

const INDEX_CACHE = new WeakMap<DocEntry[], ResolverIndex>();

//------------------------------------------------------------------
// Public API
//------------------------------------------------------------------

/**
 * Resolve an input string to a registry entry using tiered matching.
 *
 * Tier 0: canonical exact match (`entry.id === input`).
 * Tier 1: trivial input normalization (trim, strip leading `./` and `/`, collapse `//`).
 * Tier 1b: case-insensitive exact match.
 * Tier 2: alias index lookup (auto-generated + registry-declared aliases).
 *         Explicit `entry.aliases[]` override auto-generated aliases for the
 *         same key, and the alias lookup runs before suffix completion so an
 *         explicit alias wins over a structural completion.
 * Tier 3: suffix completion (`X.md`, `X/README.md`, `docs/X.md`,
 *         `docs/X/README.md`, and `docs/upgrade-notes/vNN-upgrade-notes.md`
 *         for `vNN` inputs). Ambiguous: if more than one candidate string
 *         matches a registry entry, no resolution is returned (caller falls
 *         through to suggestions).
 *
 * On no resolution, returns `{kind: 'unknown'}` with up to 5 substring-based
 * suggestions.
 */
export function resolveDocId(registry: DocEntry[], input: string): ResolveResult {
    const raw = (input ?? '').trim();
    if (!raw) return {kind: 'unknown', input: raw, suggestions: []};

    // Tier 0: exact canonical match.
    const exact = registry.find(e => e.id === raw);
    if (exact) return {kind: 'exact', entry: exact};

    // Tier 1: trivial normalization.
    const cleaned = raw
        .replace(/^\.\//, '')
        .replace(/^\/+/, '')
        .replace(/\/+/g, '/')
        .replace(/\/+$/, '');

    if (cleaned !== raw) {
        const hit = registry.find(e => e.id === cleaned);
        if (hit) return {kind: 'normalized', entry: hit, matchedAs: raw};
    }

    // Tier 1b: case-insensitive exact match against either form.
    const lower = cleaned.toLowerCase();
    const caseHit = registry.find(e => e.id.toLowerCase() === lower);
    if (caseHit) return {kind: 'normalized', entry: caseHit, matchedAs: raw};

    // Tier 2: alias index (auto + explicit; explicit overrides at build time).
    const idx = getIndex(registry);
    const aliasTarget = idx.aliases.get(lower);
    if (aliasTarget) {
        const hit = registry.find(e => e.id === aliasTarget);
        if (hit) return {kind: 'normalized', entry: hit, matchedAs: raw};
    }

    // Tier 3: suffix completion. Collect ALL candidate strings that match a
    // registry entry. If exactly one unique entry matches, resolve; if more
    // than one different entry matches, treat as unresolved (the input is
    // ambiguous under structural completion).
    const candidates = suffixCandidates(cleaned);
    const matches = new Set<DocEntry>();
    for (const candidate of candidates) {
        const hit = registry.find(e => e.id === candidate);
        if (hit) matches.add(hit);
    }
    if (matches.size === 1) {
        return {kind: 'normalized', entry: [...matches][0], matchedAs: raw};
    }

    return {kind: 'unknown', input: raw, suggestions: suggest(idx.allIds, raw)};
}

/**
 * Build (or fetch cached) resolver index for a registry. Exposed for tests
 * and for surfaces (e.g. `hoist-list-docs`) that want to display the alias map.
 */
export function getIndex(registry: DocEntry[]): ResolverIndex {
    const cached = INDEX_CACHE.get(registry);
    if (cached) return cached;

    const aliases = buildAliasMap(registry);
    const idx: ResolverIndex = {aliases, allIds: registry.map(e => e.id)};
    INDEX_CACHE.set(registry, idx);
    return idx;
}

//------------------------------------------------------------------
// Tier 3: suffix completion
//------------------------------------------------------------------

/**
 * Generate concrete id candidates from common shortenings. Each candidate is
 * a distinct string -- the caller tries each in order and the first matching a
 * registry id wins.
 */
function suffixCandidates(input: string): string[] {
    const out: string[] = [];

    // Already ends with `.md` -- try alternate roots.
    if (input.endsWith('.md')) {
        const noMd = input.slice(0, -3);
        out.push(`${noMd}/README.md`);
        out.push(`docs/${input}`);
        return out;
    }

    // `X/README` → `X/README.md`.
    if (input.endsWith('/README')) {
        out.push(`${input}.md`);
        return out;
    }

    // Bare segment / path: try several roots and shapes.
    out.push(`${input}.md`);
    out.push(`${input}/README.md`);
    out.push(`docs/${input}.md`);
    out.push(`docs/${input}/README.md`);

    // Version shortcut for upgrade notes: `v85`, `v85-upgrade-notes`.
    const versionMatch = input.match(/^v(\d+)(?:-upgrade-notes)?$/i);
    if (versionMatch) {
        out.push(`docs/upgrade-notes/v${versionMatch[1]}-upgrade-notes.md`);
    }

    return out;
}

//------------------------------------------------------------------
// Tier 2: alias index (auto-generated + explicit)
//------------------------------------------------------------------

/**
 * Build the lowercased alias → canonical id map consumed by Tier 2.
 *
 * Auto-aliases are computed per entry; keys mapping to more than one distinct
 * canonical id are dropped as ambiguous. Explicit aliases from `entry.aliases`
 * are layered in afterward and override the auto-generated ones for the same key.
 */
function buildAliasMap(registry: DocEntry[]): Map<string, string> {
    // Stage 1: gather auto-alias candidates with their source ids.
    const autoCandidates = new Map<string, Set<string>>();
    for (const entry of registry) {
        const canonicalLower = entry.id.toLowerCase();
        for (const key of autoAliasesFor(entry.id)) {
            const lower = key.toLowerCase();
            if (lower === canonicalLower) continue;
            const set = autoCandidates.get(lower) ?? new Set<string>();
            set.add(entry.id);
            autoCandidates.set(lower, set);
        }
    }

    // Stage 2: keep only unambiguous auto-aliases.
    const finalMap = new Map<string, string>();
    for (const [key, ids] of autoCandidates) {
        if (ids.size === 1) {
            finalMap.set(key, [...ids][0]);
        } else {
            log.debug(`Discarding ambiguous auto-alias "${key}" (matches: ${[...ids].join(', ')})`);
        }
    }

    // Stage 3: explicit aliases override auto-aliases. Among multiple explicit
    // declarations for the same key on different entries, the first wins and
    // subsequent declarations log a warning.
    const canonicalLookup = new Set(registry.map(e => e.id.toLowerCase()));
    const claimedByExplicit = new Set<string>();
    for (const entry of registry) {
        const explicit = entry.aliases ?? [];
        for (const a of explicit) {
            const lower = a.toLowerCase();
            // Warn if the alias collides with another entry's canonical id --
            // the canonical Tier 0 match will always win, leaving this alias dead.
            if (canonicalLookup.has(lower) && lower !== entry.id.toLowerCase()) {
                log.warn(
                    `Doc registry: alias "${a}" declared on "${entry.id}" collides with another entry's canonical id and will be unreachable.`
                );
                continue;
            }
            if (claimedByExplicit.has(lower)) {
                log.warn(
                    `Doc registry: alias "${a}" declared on "${entry.id}" already maps to "${finalMap.get(lower)}". Keeping first.`
                );
                continue;
            }
            // OK to overwrite an auto-alias here -- explicit beats implicit.
            claimedByExplicit.add(lower);
            finalMap.set(lower, entry.id);
        }
    }

    return finalMap;
}

/**
 * Compute auto-alias candidates for a single canonical id.
 *
 * Examples:
 *   `cmp/grid/README.md` → `cmp/grid/README`, `cmp/grid`, `grid`
 *   `core/README.md`     → `core/README`, `core`
 *   `docs/authentication.md` → `docs/authentication`, `authentication`
 *   `docs/upgrade-notes/v85-upgrade-notes.md` →
 *       `docs/upgrade-notes/v85-upgrade-notes`,
 *       `upgrade-notes/v85-upgrade-notes`,
 *       `v85-upgrade-notes`,
 *       `v85`
 */
function autoAliasesFor(id: string): string[] {
    const out = new Set<string>();

    const noMd = id.endsWith('.md') ? id.slice(0, -3) : id;
    out.add(noMd);

    const noReadme = noMd.endsWith('/README') ? noMd.slice(0, -'/README'.length) : noMd;
    out.add(noReadme);

    // Last path segment of the README-stripped form.
    const lastSeg = noReadme.split('/').pop();
    if (lastSeg) out.add(lastSeg);

    // `docs/` prefix stripped variants.
    if (noMd.startsWith('docs/')) {
        const stripped = noMd.slice('docs/'.length);
        out.add(stripped);
        const docsLast = stripped.split('/').pop();
        if (docsLast) out.add(docsLast);
    }

    // Version shorthand for upgrade notes.
    const versionMatch = id.match(/\/v(\d+)-upgrade-notes\.md$/);
    if (versionMatch) out.add(`v${versionMatch[1]}`);

    return [...out];
}

//------------------------------------------------------------------
// Fallback: suggestions
//------------------------------------------------------------------

/** Up to 5 substring-similar ids, ranked by where the input matches. */
function suggest(allIds: string[], input: string): string[] {
    const lower = input.toLowerCase();
    if (!lower) return [];

    const scored: Array<{id: string; score: number}> = [];
    for (const id of allIds) {
        const idLower = id.toLowerCase();
        let score = 0;
        if (idLower.includes(lower)) score += 10;

        const stripped = idLower.replace(/\.md$/, '').replace(/\/README$/, '');
        const lastSeg = stripped.split('/').pop() ?? '';
        if (lastSeg.includes(lower)) score += 5;
        if (stripped.split('/').some(s => s.startsWith(lower))) score += 3;

        if (score > 0) scored.push({id, score});
    }

    scored.sort((a, b) => b.score - a.score || a.id.length - b.id.length);
    return scored.slice(0, 5).map(s => s.id);
}
