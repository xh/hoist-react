/**
 * Section-level ranked search over hoist-react documentation.
 *
 * Every registered doc is split into sections (see `doc-sections.ts`) and indexed with
 * MiniSearch (BM25+). Each section is indexed on two fields: its heading breadcrumb
 * (`Doc title > H2 > H3`, boosted) and its own body text. Registry `title`, `description`, and
 * `keywords` act as a doc-level boost for terms they contain.
 *
 * Terms are split on punctuation and camelCase (`persistWith` indexes as `persistwith`,
 * `persist`, and `with`), lowercased, filtered against a stop-word list, and lightly stemmed.
 * Queries use prefix matching and light fuzziness, combined with OR and re-ranked by the share of
 * query terms each section matches.
 *
 * The corpus is small (~60 docs, ~1,300 sections), so the index is built in memory on first
 * use and memoized per registry.
 */
import MiniSearch, {type SearchOptions, type SearchResult} from 'minisearch';

import {log} from '../util/logger.js';
import {loadDocContent, type DocEntry} from './doc-registry.js';
import {parseDocSections, type DocSection} from './doc-sections.js';

//------------------------------------------------------------------
// Types
//------------------------------------------------------------------

/** A single ranked section returned by {@link searchDocs}. */
export interface DocSearchResult {
    entry: DocEntry;
    section: DocSection;
    /** BM25+ relevance score. Comparable only within a single result set. */
    score: number;
    /** Leading text of the section, trimmed to a sentence boundary. */
    excerpt: string;
}

/** Options for {@link searchDocs}. */
export interface DocSearchOptions {
    /** MCP category ID to filter by, or `all`. */
    category?: string;
    /** Maximum results. Clamped to 1-{@link MAX_SEARCH_LIMIT}. */
    limit?: number;
}

export const DEFAULT_SEARCH_LIMIT = 5,
    MAX_SEARCH_LIMIT = 10;

//------------------------------------------------------------------
// Tuning
//------------------------------------------------------------------

/** At most this many sections from one doc per result set. */
const MAX_PER_DOC = 2;

/** Target excerpt length in characters (~90 tokens). */
const EXCERPT_CHARS = 360;

/** Field boosts. The breadcrumb is short and highly descriptive. */
const FIELD_BOOST = {heading: 3, body: 1};

/** Multiplier for a term that also appears in the doc's registry metadata. */
const DOC_META_BOOST = 1.3;

/**
 * Per-doc score multipliers. Upgrade notes and the doc index mention nearly every API but are
 * rarely the best answer to a how-to query, so they rank below the primary docs.
 */
function docWeight(entry: DocEntry): number {
    if (entry.id.startsWith('docs/upgrade-notes/')) return 0.5;
    // The MCP server's own README documents this tooling, not app development. It mentions many
    // framework terms in passing and otherwise outranks the docs that answer the question.
    if (entry.id === 'mcp/README.md') return 0.5;
    if (entry.mcpCategory === 'index') return 0.6;
    return 1;
}

const STOP_WORDS = new Set(
    (
        'a about after all also an and any are as at be been but by can could do does doing ' +
        'during each for from had has have how i if in into is it its just me my of on or our ' +
        'should so some such than that the their them then there these they this those to too ' +
        'up us via was we were what when where which while who why will with would you your ' +
        'hoist use used uses using want need way'
    ).split(' ')
);

//------------------------------------------------------------------
// Public API
//------------------------------------------------------------------

/**
 * Search all docs in the registry, returning ranked sections with excerpts.
 *
 * Returns at most {@link MAX_PER_DOC} sections per doc so a single large README cannot crowd out
 * the rest of the result set.
 */
export function searchDocs(
    registry: DocEntry[],
    query: string,
    options: DocSearchOptions = {}
): DocSearchResult[] {
    const terms = queryTerms(query);
    if (terms.length === 0) return [];

    const idx = getSearchIndex(registry),
        limit = Math.min(Math.max(options.limit ?? DEFAULT_SEARCH_LIMIT, 1), MAX_SEARCH_LIMIT),
        category = options.category && options.category !== 'all' ? options.category : null,
        querySet = new Set(terms),
        searchOpts: SearchOptions = {
            boost: FIELD_BOOST,
            prefix: term => term.length >= 3,
            fuzzy: term => (term.length >= 6 ? 0.2 : false),
            maxFuzzy: 2,
            tokenize: s => s.split(' '),
            processTerm: t => t,
            boostDocument: (id, term) => {
                // Skip a prefix or fuzzy match onto a compound identifier whose leading part the
                // query already matches (`show` → `showFeedbackDialog`). The part is indexed on
                // its own, so this only drops double-counting that favors identifier-dense text.
                const head = idx.compoundHeads.get(term);
                if (head && !querySet.has(term) && terms.some(t => head.startsWith(t))) return 0;

                const section = idx.sections[id],
                    meta = idx.metaTerms.get(section.docId);
                return idx.weights.get(section.docId)! * (meta?.has(term) ? DOC_META_BOOST : 1);
            },
            filter: category ? hit => idx.sections[hit.id].category === category : undefined
        },
        q = terms.join(' ');

    // Rank by BM25 score scaled by the share of query terms each section matches. This
    // prefers sections matching every term (as AND would) without letting a weak all-term
    // match outrank a strong match on most terms (as strict AND-then-OR does).
    const ranked = idx.miniSearch
        .search(q, {...searchOpts, combineWith: 'OR'})
        .map(hit => ({hit, score: (hit.score * new Set(hit.queryTerms).size) / terms.length}))
        .sort((a, b) => b.score - a.score);

    const picked: Array<{hit: SearchResult; score: number}> = [],
        perDoc = new Map<string, number>();
    for (const it of ranked) {
        if (picked.length >= limit) break;
        const docId = idx.sections[it.hit.id].docId,
            count = perDoc.get(docId) ?? 0;
        if (count >= MAX_PER_DOC) continue;
        perDoc.set(docId, count + 1);
        picked.push(it);
    }

    return picked.map(({hit, score}) => {
        const {section} = idx.sections[hit.id];
        return {
            entry: idx.entries.get(section.docId)!,
            section,
            score,
            excerpt: makeExcerpt(section.body)
        };
    });
}

/** Tokenize and process a query the same way indexed text is processed. */
function queryTerms(query: string): string[] {
    return [...new Set(tokenize(query ?? '').flatMap(processTerm))];
}

//------------------------------------------------------------------
// Index
//------------------------------------------------------------------

interface IndexedSection {
    id: number;
    /** The section's breadcrumb, plus any `####` headings in its body. */
    heading: string;
    body: string;
}

interface SearchIndex {
    miniSearch: MiniSearch<IndexedSection>;
    /** Indexed sections by MiniSearch document id. */
    sections: Array<{section: DocSection; category: string; docId: string}>;
    entries: Map<string, DocEntry>;
    /** Processed terms from each doc's registry title, description, and keywords. */
    metaTerms: Map<string, Set<string>>;
    weights: Map<string, number>;
    /** Indexed compound terms (`showfeedbackdialog`) mapped to their leading part (`show`). */
    compoundHeads: Map<string, string>;
}

const INDEX_CACHE = new WeakMap<DocEntry[], SearchIndex>();

/** Build (or fetch the memoized) search index for a registry. */
function getSearchIndex(registry: DocEntry[]): SearchIndex {
    const cached = INDEX_CACHE.get(registry);
    if (cached) return cached;

    const start = Date.now(),
        compoundHeads = new Map<string, string>(),
        miniSearch = new MiniSearch<IndexedSection>({
            fields: ['heading', 'body'],
            tokenize,
            processTerm: token => {
                const {whole, parts} = splitToken(token);
                if (whole && parts.length) compoundHeads.set(whole, parts[0]);
                return processTerm(token);
            }
        }),
        sections: SearchIndex['sections'] = [],
        docs: IndexedSection[] = [],
        entries = new Map<string, DocEntry>(),
        metaTerms = new Map<string, Set<string>>(),
        weights = new Map<string, number>();

    for (const entry of registry) {
        entries.set(entry.id, entry);
        weights.set(entry.id, docWeight(entry));
        metaTerms.set(
            entry.id,
            new Set(queryTerms([entry.title, entry.description, ...entry.keywords].join(' ')))
        );

        let content: string;
        try {
            content = loadDocContent(entry);
        } catch (e) {
            log.warn(`Skipping "${entry.id}" in search index: ${e}`);
            continue;
        }

        for (const section of parseDocSections(entry, content)) {
            const body = indexableBody(section.body);
            // Skip sections with no text of their own (e.g. a `##` that only groups `###`s) -
            // their children carry the parent heading in their breadcrumbs.
            if (body.replace(/[^\p{L}\p{N}]/gu, '').length < 20) continue;

            const id = sections.length;
            sections.push({section, category: entry.mcpCategory, docId: entry.id});
            docs.push({id, heading: [section.breadcrumb, ...subHeadings(body)].join(' '), body});
        }
    }

    miniSearch.addAll(docs);
    const idx: SearchIndex = {miniSearch, sections, entries, metaTerms, weights, compoundHeads};
    INDEX_CACHE.set(registry, idx);

    const tokens = sections.reduce((sum, it) => sum + it.section.tokens, 0);
    log.info(
        `Doc search index built: ${sections.length} sections, ~${tokens.toLocaleString('en-US')} tokens, ${Date.now() - start}ms`
    );
    return idx;
}

//------------------------------------------------------------------
// Text processing
//------------------------------------------------------------------

/** Split on anything other than letters and digits, preserving case for camelCase splitting. */
function tokenize(text: string): string[] {
    return text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/**
 * Expand a raw token into index terms: the whole token lowercased, plus its camelCase parts
 * (`persistWith` → `persistwith`, `persist`, `with`). Drops stop words and single characters,
 * then stems what remains.
 */
function processTerm(token: string): string[] {
    return splitToken(token).terms;
}

interface SplitToken {
    whole: string | null;
    parts: string[];
    /** Whole and parts, de-duplicated - the index terms for this token. */
    terms: string[];
}

/** Memoized by raw token - doc vocabulary repeats heavily, so this roughly halves build time. */
const SPLIT_CACHE = new Map<string, SplitToken>();

/**
 * Split a raw token into its processed whole and, for a camelCase compound, its processed
 * parts. Either may be filtered out as a stop word or single character.
 */
function splitToken(token: string): SplitToken {
    let ret = SPLIT_CACHE.get(token);
    if (ret) return ret;

    const keep = (t: string) => (t.length < 2 || STOP_WORDS.has(t) ? null : stem(t)),
        rawParts = /[A-Z]/.test(token)
            ? token.split(/(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/)
            : [token],
        parts =
            rawParts.length > 1
                ? rawParts.map(p => keep(p.toLowerCase())).filter((p): p is string => p != null)
                : [];
    const whole = keep(token.toLowerCase());
    ret = {whole, parts, terms: [...new Set(whole ? [whole, ...parts] : parts)]};
    SPLIT_CACHE.set(token, ret);
    return ret;
}

/**
 * Light suffix stemmer, applied identically at index and query time. Folds plurals and common
 * verb/noun endings so `confirmation` matches `confirm` and `columns` matches `column`. Prefix
 * matching at query time covers the reverse direction (`config` → `configuration`).
 */
function stem(term: string): string {
    if (term.length < 4 || /\d/.test(term)) return term;

    let t = term;
    if (t.endsWith('ies') && t.length > 4) t = t.slice(0, -3) + 'y';
    else if (t.endsWith('sses')) t = t.slice(0, -2);
    else if (t.endsWith('s') && !/(ss|us|is)$/.test(t)) t = t.slice(0, -1);

    for (const suffix of ['ation', 'ing', 'ed']) {
        if (t.endsWith(suffix) && t.length - suffix.length >= 4) {
            t = t.slice(0, -suffix.length);
            // Undouble a trailing consonant left by -ing/-ed (`mapped` → `map`), except l/s/z.
            if (suffix !== 'ation' && /([^aeiouylsz])\1$/.test(t)) t = t.slice(0, -1);
            break;
        }
    }
    return t;
}

const TOC_ROW_RE = /^\s*\|\s*\[[^\]]+\]\(#[^)]*\)\s*\|/,
    TABLE_RULE_RE = /^\s*\|?[\s:|-]+\|?\s*$/,
    FENCE_RE = /^\s*(```|~~~)/,
    SUBHEADING_RE = /^#{4,6}\s+(.+)$/gm;

/** Section body with table-of-contents rows removed - they match every query and answer none. */
function indexableBody(body: string): string {
    return body
        .split('\n')
        .filter(line => !TOC_ROW_RE.test(line))
        .join('\n');
}

/** `####`-and-deeper headings within a body, indexed with the (boosted) heading field. */
function subHeadings(body: string): string[] {
    return [...body.matchAll(SUBHEADING_RE)].map(m => m[1]);
}

/**
 * Leading text of a section, trimmed to about {@link EXCERPT_CHARS} at a sentence boundary.
 * Blank lines, TOC rows, table rules, and link targets are dropped and whitespace collapsed.
 * Reading stops at the first code block once there is enough prose to describe the section -
 * code is included only when the section leads with it.
 */
function makeExcerpt(body: string): string {
    const kept: string[] = [];
    let inFence = false,
        length = 0;
    for (const raw of body.split('\n')) {
        const line = raw.trim();
        if (FENCE_RE.test(line)) {
            if (!inFence && length >= EXCERPT_CHARS / 3) break;
            inFence = !inFence;
            continue;
        }
        if (!line || TOC_ROW_RE.test(line) || TABLE_RULE_RE.test(line)) continue;

        kept.push(line.replace(/^#{1,6}\s+/, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'));
        length += line.length;
        if (length > EXCERPT_CHARS) break;
    }

    const text = kept.join(' ').replace(/\s+/g, ' ');
    if (text.length <= EXCERPT_CHARS) return text;

    const cut = text.slice(0, EXCERPT_CHARS),
        sentenceEnds = [...cut.matchAll(/[.!?:](?=\s)/g)],
        lastSentence = sentenceEnds.at(-1)?.index ?? -1;
    if (lastSentence >= EXCERPT_CHARS / 2) return cut.slice(0, lastSentence + 1);

    return cut.slice(0, cut.lastIndexOf(' ')) + '...';
}
