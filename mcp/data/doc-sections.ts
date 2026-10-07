/**
 * Section model for hoist-react documentation.
 *
 * Splits a markdown doc into sections at `##` and `###` headings, with any text before the
 * first such heading forming a leading "intro" section. Sections are the unit of search
 * (`doc-search.ts`) and of targeted reads (`hoist-read-doc` with `section` or `outline`).
 *
 * Headings inside fenced code blocks are ignored. `####` and deeper headings stay inside their
 * containing section. Line numbers are 1-based and inclusive throughout.
 *
 * Reference-style link definitions (`[label]: url`) usually sit at the end of a doc, outside the
 * section that uses them. A section read appends the definitions its links need.
 */
import type {DocEntry} from './doc-registry.js';

//------------------------------------------------------------------
// Types
//------------------------------------------------------------------

/** A single `##` / `###` section of a doc, or the intro text before the first one. */
export interface DocSection {
    /** Registry id of the containing doc. */
    docId: string;
    /** 1 for the intro section, 2 or 3 for `##` / `###` sections. */
    level: 1 | 2 | 3;
    /** Heading text with markdown formatting removed. The intro uses the doc's `#` heading. */
    heading: string;
    /** Headings below the doc title, e.g. `['Built-in Model Support', 'GridModel']`. Empty for the intro. */
    path: string[];
    /** Value to pass as `section` to read this section - the path joined with ` > `, or the intro heading. */
    ref: string;
    /** Display path including the doc title, e.g. `Persistence > Built-in Model Support > GridModel`. */
    breadcrumb: string;
    /** First line of the section (its heading line, or line 1 for the intro). */
    startLine: number;
    /** Last line of the section's own text, before the next `##` or `###` heading. */
    endLine: number;
    /**
     * Last line of the section including nested subsections - what a section read returns.
     * Differs from `endLine` only for a `##` section with `###` children.
     */
    extentEndLine: number;
    /** Estimated token count of the full extent (startLine to extentEndLine). */
    tokens: number;
    /** The section's own text, excluding its heading line. Used for indexing and excerpts. */
    body: string;
}

/** Outcome of resolving a caller-supplied section name against a doc's sections. */
export type SectionResolveResult =
    | {kind: 'found'; section: DocSection}
    | {kind: 'ambiguous'; candidates: DocSection[]}
    | {kind: 'unknown'; suggestions: DocSection[]};

//------------------------------------------------------------------
// Tokens
//------------------------------------------------------------------

/**
 * Estimate LLM token count for a string at ~4 characters per token. Coarse, but stable and
 * good enough to size reads and keep search output within budget.
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/** Format a token estimate for display, e.g. `~6,760 tokens`. */
export function formatTokens(tokens: number): string {
    return `~${tokens.toLocaleString('en-US')} tokens`;
}

//------------------------------------------------------------------
// Parsing
//------------------------------------------------------------------

const FENCE_RE = /^\s*(```|~~~)/,
    HEADING_RE = /^(#{1,3})\s+(.+?)(?:\s+#+)?\s*$/;

/** Split a doc's markdown content into sections. */
export function parseDocSections(entry: DocEntry, content: string): DocSection[] {
    const lines = splitLines(content),
        headings: Array<{level: number; text: string; line: number}> = [];

    let inFence = false,
        h1: string | null = null,
        h1Line = 0;
    lines.forEach((line, i) => {
        if (FENCE_RE.test(line)) {
            inFence = !inFence;
            return;
        }
        if (inFence) return;

        const match = HEADING_RE.exec(line);
        if (!match) return;

        const level = match[1].length,
            text = cleanHeading(match[2]);
        if (level === 1) {
            if (h1 == null) {
                h1 = text;
                h1Line = i + 1;
            }
        } else {
            headings.push({level, text, line: i + 1});
        }
    });

    const lastLine = lines.length,
        sections: DocSection[] = [],
        firstHeadingLine = headings[0]?.line ?? lastLine + 1;

    // Intro: everything before the first `##` / `###` heading.
    if (firstHeadingLine > 1) {
        const heading = h1 ?? entry.title,
            endLine = firstHeadingLine - 1;
        sections.push({
            docId: entry.id,
            level: 1,
            heading,
            path: [],
            ref: heading,
            breadcrumb: entry.title,
            startLine: 1,
            endLine,
            extentEndLine: endLine,
            tokens: estimateTokens(sliceLines(lines, 1, endLine)),
            body: lines
                .slice(0, endLine)
                .filter((_, i) => i + 1 !== h1Line)
                .join('\n')
        });
    }

    let currentH2: string | null = null;
    headings.forEach((h, idx) => {
        const level = h.level as 2 | 3,
            endLine = (headings[idx + 1]?.line ?? lastLine + 1) - 1;

        if (level === 2) currentH2 = h.text;
        const path = level === 3 && currentH2 ? [currentH2, h.text] : [h.text];

        // A `##` section's extent runs to the next `##`; a `###` ends at the next heading.
        let extentEndLine = endLine;
        if (level === 2) {
            const nextH2 = headings.slice(idx + 1).find(it => it.level === 2);
            extentEndLine = (nextH2?.line ?? lastLine + 1) - 1;
        }

        sections.push({
            docId: entry.id,
            level,
            heading: h.text,
            path,
            ref: path.join(' > '),
            breadcrumb: [entry.title, ...path].join(' > '),
            startLine: h.line,
            endLine,
            extentEndLine,
            tokens: estimateTokens(sliceLines(lines, h.line, extentEndLine)),
            body: sliceLines(lines, h.line + 1, endLine)
        });
    });

    return sections;
}

/**
 * Return the markdown for a section's full extent, including its heading and subsections. Any
 * reference link definitions the section uses but does not contain are appended at the end.
 */
export function getSectionContent(content: string, section: DocSection): string {
    const lines = splitLines(content),
        body = sliceLines(lines, section.startLine, section.extentEndLine).trimEnd(),
        used = referencedLabels(body),
        defs = [...parseLinkDefinitions(lines).entries()]
            .filter(([label, def]) => {
                const inSection =
                    def.line >= section.startLine && def.line <= section.extentEndLine;
                return used.has(label) && !inSection;
            })
            .map(([, def]) => def.text);

    return defs.length ? `${body}\n\n${defs.join('\n')}` : body;
}

/** Sections nested within (and including) the given section. */
export function getSubsections(sections: DocSection[], section: DocSection): DocSection[] {
    return sections.filter(
        s => s.startLine >= section.startLine && s.startLine <= section.extentEndLine
    );
}

//------------------------------------------------------------------
// Links
//------------------------------------------------------------------

/** A reference link definition line, e.g. `[ts7]: https://...`. Captures the label. */
export const LINK_DEF_RE = /^ {0,3}\[([^\]]+)\]:\s*\S/;

const INLINE_LINK_RE = /\[([^\]]+)\]\([^)]*\)/g,
    REF_LINK_RE = /\[([^\]]+)\]\[([^\]]*)\]/g;

/** Reduce inline (`[text](url)`) and reference (`[text][label]`, `[text][]`) links to their text. */
export function stripLinks(text: string): string {
    return text.replace(INLINE_LINK_RE, '$1').replace(REF_LINK_RE, '$1');
}

/**
 * Reference link definitions outside fenced code, keyed by normalized label. The first
 * definition of a label wins, as in CommonMark.
 */
function parseLinkDefinitions(lines: string[]): Map<string, {line: number; text: string}> {
    const ret = new Map<string, {line: number; text: string}>();
    let inFence = false;
    lines.forEach((text, i) => {
        if (FENCE_RE.test(text)) {
            inFence = !inFence;
            return;
        }
        const match = inFence ? null : LINK_DEF_RE.exec(text);
        if (!match) return;

        const label = normalizeLabel(match[1]);
        if (!ret.has(label)) ret.set(label, {line: i + 1, text});
    });
    return ret;
}

/** Normalized labels of the `[text][label]` and `[text][]` links in some markdown. */
function referencedLabels(markdown: string): Set<string> {
    return new Set([...markdown.matchAll(REF_LINK_RE)].map(m => normalizeLabel(m[2] || m[1])));
}

/** Match labels as CommonMark does - ignoring case and runs of whitespace. */
function normalizeLabel(label: string): string {
    return label.trim().replace(/\s+/g, ' ').toLowerCase();
}

//------------------------------------------------------------------
// Resolution
//------------------------------------------------------------------

/**
 * Resolve a caller-supplied section name to a single section of a doc.
 *
 * Accepts a heading (`GridModel`), a path (`Built-in Model Support > GridModel`), or a full
 * breadcrumb with the doc title as its first segment. Matching ignores case, punctuation, and
 * markdown (`## Mask`, `persistWith`, `XH.confirm()`), and tries tiers in order, returning the
 * first tier with any match:
 *   1. Exact match on the full path (or the intro heading / doc title).
 *   2. Exact match on the trailing segments of a path.
 *   3. Prefix match on the trailing segments.
 *   4. Substring match on the trailing segments.
 *
 * A tier with more than one distinct match is reported as ambiguous rather than guessed.
 */
export function resolveSection(
    entry: DocEntry,
    sections: DocSection[],
    input: string
): SectionResolveResult {
    let segments = splitSectionInput(input);
    if (segments.length === 0) return {kind: 'unknown', suggestions: []};

    const intro = sections.find(s => s.level === 1),
        titleKeys = [normalize(entry.title), normalize(intro?.heading ?? '')].filter(Boolean);

    // A single segment naming the doc itself addresses the intro.
    if (segments.length === 1 && titleKeys.includes(segments[0])) {
        const exact = sections.filter(s => s.level > 1 && normalize(s.heading) === segments[0]);
        if (exact.length === 0 && intro) return {kind: 'found', section: intro};
    }

    // Tolerate a leading doc-title segment, as shown in search breadcrumbs.
    if (segments.length > 1 && titleKeys.includes(segments[0])) segments = segments.slice(1);

    const addressable = sections.filter(s => s.level > 1),
        keyed = addressable.map(s => ({s, keys: s.path.map(normalize)})),
        tiers: Array<(keys: string[]) => boolean> = [
            keys => keys.length === segments.length && tailMatches(keys, (k, q) => k === q),
            keys => tailMatches(keys, (k, q) => k === q),
            keys => tailMatches(keys, (k, q) => k.startsWith(q)),
            keys => tailMatches(keys, (k, q) => k.includes(q))
        ];

    function tailMatches(keys: string[], cmp: (key: string, query: string) => boolean): boolean {
        if (keys.length < segments.length) return false;
        const tail = keys.slice(keys.length - segments.length);
        return tail.every((k, i) => cmp(k, segments[i]));
    }

    for (const tier of tiers) {
        const matches = keyed.filter(it => tier(it.keys)).map(it => it.s);
        if (matches.length === 1) return {kind: 'found', section: matches[0]};
        if (matches.length > 1) {
            // Identical breadcrumbs cannot be told apart by name - take the first.
            const distinct = new Set(matches.map(m => m.ref));
            if (distinct.size === 1) return {kind: 'found', section: matches[0]};
            return {kind: 'ambiguous', candidates: matches};
        }
    }

    return {kind: 'unknown', suggestions: suggestSections(sections, input)};
}

//------------------------------------------------------------------
// Implementation
//------------------------------------------------------------------

/** Strip inline markdown from heading text: backticks, emphasis, links, trailing anchors. */
function cleanHeading(raw: string): string {
    return stripLinks(raw.replace(/\s*\{#[^}]*\}\s*$/, ''))
        .replace(/[`*]/g, '')
        .trim();
}

/** Split content into lines, dropping the empty entry after a trailing newline. */
export function splitLines(content: string): string[] {
    const lines = content.split('\n');
    if (lines.at(-1) === '') lines.pop();
    return lines;
}

function sliceLines(lines: string[], start: number, end: number): string {
    return lines.slice(start - 1, end).join('\n');
}

/** Lowercase and drop everything but letters and digits. */
function normalize(s: string): string {
    return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

/** Split `A > B` (also `›` / `»`) into normalized segments, dropping empties. */
function splitSectionInput(input: string): string[] {
    return (input ?? '')
        .split(/\s*[>›»]\s*/)
        .map(normalize)
        .filter(Boolean);
}

/** Up to 5 sections whose headings share the most words with the input. */
function suggestSections(sections: DocSection[], input: string): DocSection[] {
    const words = (input ?? '')
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(w => w.length > 1);
    if (words.length === 0) return [];

    return sections
        .filter(s => s.level > 1)
        .map(s => {
            const key = normalize(s.ref);
            return {s, score: words.filter(w => key.includes(w)).length};
        })
        .filter(it => it.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(it => it.s);
}
