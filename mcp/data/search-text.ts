/**
 * Text pipeline shared by the doc search index (`doc-search.ts`) and the symbol search index
 * (`symbol-search.ts`), so a query is processed the same way whichever index it hits.
 *
 * Terms are split on punctuation and camelCase (`persistWith` indexes as `persistwith`,
 * `persist`, and `with`), lowercased, filtered against a stop-word list, and lightly stemmed.
 * Also provides the two ranking helpers both indexes use: coverage-scaled OR combination and
 * the compound-head guard that stops a prefix match from counting a camelCase identifier twice.
 */
import type {SearchResult} from 'minisearch';

export const STOP_WORDS = new Set(
    (
        'a about after all also an and any are as at be been but by can could do does doing ' +
        'during each for from had has have how i if in into is it its just me my of on or our ' +
        'should so some such than that the their them then there these they this those to too ' +
        'up us via was we were what when where which while who why will with would you your ' +
        'hoist use used uses using want need way'
    ).split(' ')
);

//------------------------------------------------------------------
// Tokenizing and term processing
//------------------------------------------------------------------

/** Split on anything other than letters and digits, preserving case for camelCase splitting. */
export function tokenize(text: string): string[] {
    return text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/**
 * Expand a raw token into index terms: the whole token lowercased, plus its camelCase parts
 * (`persistWith` → `persistwith`, `persist`, `with`). Drops stop words and single characters,
 * then stems what remains.
 */
export function processTerm(token: string): string[] {
    return splitToken(token).terms;
}

/** Tokenize and process a query the same way indexed text is processed. */
export function queryTerms(query: string): string[] {
    return [...new Set(tokenize(query ?? '').flatMap(processTerm))];
}

export interface SplitToken {
    whole: string | null;
    parts: string[];
    /** Whole and parts, de-duplicated - the index terms for this token. */
    terms: string[];
}

/** Memoized by raw token - vocabulary repeats heavily, so this roughly halves build time. */
const SPLIT_CACHE = new Map<string, SplitToken>();

/**
 * Split a raw token into its processed whole and, for a camelCase compound, its processed
 * parts. Either may be filtered out as a stop word or single character.
 */
export function splitToken(token: string): SplitToken {
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
export function stem(term: string): string {
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

//------------------------------------------------------------------
// Ranking helpers
//------------------------------------------------------------------

/**
 * A MiniSearch `processTerm` that also records, for every camelCase compound it indexes, the
 * compound's leading part (`showfeedbackdialog` → `show`). See {@link isRedundantCompoundMatch}.
 */
export interface TermProcessor {
    processTerm: (token: string) => string[];
    /** Indexed compound terms mapped to their leading part. */
    compoundHeads: Map<string, string>;
}

export function createTermProcessor(): TermProcessor {
    const compoundHeads = new Map<string, string>();
    return {
        compoundHeads,
        processTerm: token => {
            const {whole, parts} = splitToken(token);
            if (whole && parts.length) compoundHeads.set(whole, parts[0]);
            return processTerm(token);
        }
    };
}

/**
 * True when `term` is a prefix or fuzzy match onto a compound identifier whose leading part
 * the query already matches (`show` → `showFeedbackDialog`). The part is indexed on its own,
 * so counting the compound too only favors identifier-dense text. Callers return a boost of 0
 * for such a match.
 */
export function isRedundantCompoundMatch(
    compoundHeads: Map<string, string>,
    term: string,
    terms: string[],
    querySet: Set<string>
): boolean {
    const head = compoundHeads.get(term);
    return !!head && !querySet.has(term) && terms.some(t => head.startsWith(t));
}

/**
 * Rank OR-combined hits by BM25 score scaled by the share of query terms each hit matches.
 * This prefers hits matching every term (as AND would) without letting a weak all-term match
 * outrank a strong match on most terms (as strict AND-then-OR does).
 */
export function rankByCoverage<T extends SearchResult>(
    hits: T[],
    termCount: number
): Array<{hit: T; score: number}> {
    return hits
        .map(hit => ({hit, score: (hit.score * new Set(hit.queryTerms).size) / termCount}))
        .sort((a, b) => b.score - a.score);
}

//------------------------------------------------------------------
// Summaries
//------------------------------------------------------------------

/** Sentence-ending punctuation not preceded by a common abbreviation. */
const SENTENCE_END_RE = /(?<!\b(?:e\.g|i\.e|vs|etc|cf))[.!?](?=\s|$)/;

/**
 * Split a JSDoc description into its first sentence and the rest. `{@link X}` references are
 * unwrapped to their display text, whitespace is collapsed, and a paragraph break also ends the
 * first sentence.
 */
export function splitSummary(jsDoc: string): {summary: string; rest: string} {
    const text = (jsDoc ?? '').trim();
    if (!text) return {summary: '', rest: ''};

    const paragraph = text.split(/\n\s*\n/)[0],
        firstPara = unwrapLinks(paragraph).replace(/\s+/g, ' ').trim(),
        end = SENTENCE_END_RE.exec(firstPara),
        cut = end ? end.index + 1 : firstPara.length,
        summary = firstPara.slice(0, cut).trim(),
        restOfPara = firstPara.slice(cut).trim(),
        restParas = unwrapLinks(text.slice(paragraph.length)).replace(/\s+/g, ' ').trim();
    return {summary, rest: [restOfPara, restParas].filter(Boolean).join(' ')};
}

/**
 * First sentence of a JSDoc description, trimmed to at most `maxChars` at a word boundary.
 * Used for the one-line-per-hit search output.
 */
export function firstSentence(jsDoc: string, maxChars: number): string {
    const {summary} = splitSummary(jsDoc);
    if (summary.length <= maxChars) return summary;
    const cut = summary.slice(0, maxChars),
        space = cut.lastIndexOf(' ');
    return (space > maxChars / 2 ? cut.slice(0, space) : cut) + '...';
}

/** `{@link Foo}` → `Foo`, `{@link Foo|text}` and `{@link Foo text}` → `text`. */
function unwrapLinks(text: string): string {
    return text.replace(
        /\{@link(?:code|plain)?\s+([^}|\s]+)(?:\s*\|\s*|\s+)?([^}]*)\}/g,
        (_, target, label) => (label as string).trim() || target
    );
}
