/**
 * Shared formatting and projection functions for documentation search, listing, and reading.
 *
 * Used by both the MCP tools (`tools/docs.ts`) and the CLI (`cli/docs.ts`)
 * to produce identical output from the same data. Offers two projections of
 * each result set:
 * - Text -- human-readable block for CLI stdout and MCP text content.
 * - Structured -- typed JSON shape for MCP `structuredContent` and CLI
 *   `--json` output. Shape is validated by the exported zod schema.
 *
 * The only surface-specific text is the short "how to read more" hint, since the MCP tool and
 * the CLI command take their arguments differently. See {@link Surface}.
 */
import {z} from 'zod';

import {loadDocContent, type DocEntry, type McpCategory} from '../data/doc-registry.js';
import {resolveDocId} from '../data/doc-id-resolver.js';
import type {DocSearchResult} from '../data/doc-search.js';
import {
    estimateTokens,
    formatTokens,
    getSectionContent,
    getSubsections,
    parseDocSections,
    resolveSection,
    splitLines,
    type DocSection
} from '../data/doc-sections.js';

/** Which interface is rendering output - selects the syntax of read-more hints. */
export type Surface = 'mcp' | 'cli';

/** Full reads above this size carry a note pointing to `section` and `outline`. */
export const LARGE_DOC_TOKENS = 3000;

//------------------------------------------------------------------
// Search: text
//------------------------------------------------------------------

/** Format ranked section results as a compact text block. */
export function formatSearchResults(results: DocSearchResult[], query: string): string {
    if (results.length === 0) {
        return `No sections matched "${query}". Try two or three keywords, using the names the docs use (e.g. "persistWith", "XH.confirm").`;
    }

    const lines = [
        `${results.length} section${results.length > 1 ? 's' : ''} matched "${query}":`,
        ''
    ];
    results.forEach((r, i) => {
        const s = r.section;
        lines.push(
            `${i + 1}. ${s.breadcrumb}`,
            `   id: ${r.entry.id} | section: "${s.ref}" | L${s.startLine}-${s.extentEndLine} | ${formatTokens(s.tokens)}`,
            `   ${r.excerpt}`,
            ''
        );
    });
    return lines.join('\n').trimEnd();
}

/** One-line hint on reading a search result, in the calling surface's syntax. */
export function searchReadHint(surface: Surface): string {
    return surface === 'mcp'
        ? "Read a result with hoist-read-doc {id, section}, or list a doc's sections with {id, outline: true}."
        : 'Read a result with: hoist-docs read <id> --section "<section>" (or --outline to list sections).';
}

//------------------------------------------------------------------
// Search: structured
//------------------------------------------------------------------

/**
 * Zod schema for the structured output of `hoist-search-docs` (and the CLI's
 * `hoist-docs search --json`). Shared as the single source of truth for the
 * MCP tool's `outputSchema` and the CLI's JSON emitter, so both surfaces
 * agree on field names, types, and validation.
 */
export const searchDocsOutputSchema = z.object({
    query: z.string().describe('Echoed back from the request for correlation.'),
    resultCount: z.number().int().describe('Number of results returned (may be capped by limit).'),
    results: z
        .array(
            z.object({
                id: z
                    .string()
                    .describe(
                        'Document ID, also its path relative to the repo root. Pass to `hoist-read-doc` with `section` to read this result.'
                    ),
                section: z
                    .string()
                    .describe(
                        'Section path below the doc title (e.g. "Built-in Model Support > GridModel"). Pass as `section` to `hoist-read-doc`.'
                    ),
                breadcrumb: z
                    .string()
                    .describe(
                        'Doc title plus section path, e.g. "Persistence > Built-in Model Support > GridModel".'
                    ),
                category: z.string().describe('MCP category ID (e.g. "package", "concept").'),
                startLine: z.number().int().describe('1-based first line of the section.'),
                endLine: z
                    .number()
                    .int()
                    .describe('1-based last line of the section, including nested subsections.'),
                tokens: z
                    .number()
                    .int()
                    .describe('Estimated tokens to read the full section (startLine to endLine).'),
                score: z
                    .number()
                    .describe('Relevance score. Comparable only within one result set.'),
                excerpt: z.string().describe('Leading text of the section, trimmed at a sentence.')
            })
        )
        .describe('Results sorted by score descending, at most 2 per doc.')
});

/** Structured output type for `hoist-search-docs`, derived from the zod schema. */
export type SearchDocsOutput = z.infer<typeof searchDocsOutputSchema>;

/** Project internal search results into the public structured output shape. */
export function toSearchDocsOutput(query: string, results: DocSearchResult[]): SearchDocsOutput {
    return {
        query,
        resultCount: results.length,
        results: results.map(r => ({
            id: r.entry.id,
            section: r.section.ref,
            breadcrumb: r.section.breadcrumb,
            category: r.entry.mcpCategory,
            startLine: r.section.startLine,
            endLine: r.section.extentEndLine,
            tokens: r.section.tokens,
            score: Math.round(r.score * 10) / 10,
            excerpt: r.excerpt
        }))
    };
}

//------------------------------------------------------------------
// Structured output: hoist-list-docs
//------------------------------------------------------------------

/**
 * Zod schema for the structured output of `hoist-list-docs` (and the CLI's
 * `hoist-docs list --json`). Entries are returned as a flat array with a
 * `category` field; JSON consumers can group client-side if needed. The
 * `categories` array is included so consumers know the full set of valid
 * category IDs even when a filter excludes some.
 */
export const listDocsOutputSchema = z.object({
    categoryFilter: z
        .string()
        .describe('Applied category filter: "all" or a specific MCP category ID.'),
    totalCount: z.number().int().describe('Number of entries in the response (after filtering).'),
    entries: z.array(
        z.object({
            id: z
                .string()
                .describe(
                    'Document ID, also its path relative to the repo root. Pass to `hoist-docs read <id>` or fetch `hoist://docs/{id}`.'
                ),
            title: z.string(),
            category: z.string().describe('MCP category ID (e.g. "package", "concept").'),
            description: z.string()
        })
    ),
    categories: z
        .array(
            z.object({
                id: z.string(),
                title: z.string()
            })
        )
        .describe('Full set of MCP categories available in the registry.')
});

/** Structured output type for `hoist-list-docs`, derived from the zod schema. */
export type ListDocsOutput = z.infer<typeof listDocsOutputSchema>;

/** Project the internal registry into the public structured shape. */
export function toListDocsOutput(
    registry: DocEntry[],
    mcpCategories: McpCategory[],
    categoryFilter?: string
): ListDocsOutput {
    const effectiveFilter = categoryFilter ?? 'all';
    const entries =
        effectiveFilter === 'all'
            ? registry
            : registry.filter(e => e.mcpCategory === effectiveFilter);

    return {
        categoryFilter: effectiveFilter,
        totalCount: entries.length,
        entries: entries.map(e => ({
            id: e.id,
            title: e.title,
            category: e.mcpCategory,
            description: e.description
        })),
        categories: mcpCategories.map(c => ({id: c.id, title: c.title}))
    };
}

//------------------------------------------------------------------
// Read: hoist-read-doc
//------------------------------------------------------------------

/**
 * Zod schema for the structured output of `hoist-read-doc` (and the CLI's
 * `hoist-docs read --json`). A full read returns the whole doc in `content`. A `section` read
 * returns that section in `content` and identifies it in `section`. An `outline` read returns
 * `outline` and omits `content`.
 */
export const readDocOutputSchema = z.object({
    id: z.string().describe('Canonical document ID, also its path relative to the repo root.'),
    title: z.string(),
    category: z.string().describe('MCP category ID (e.g. "package", "concept").'),
    tokens: z
        .number()
        .int()
        .describe('Estimated tokens of the returned content, or of the whole doc for an outline.'),
    content: z
        .string()
        .optional()
        .describe('Markdown body - the full doc, or the requested section. Absent for outlines.'),
    section: z
        .object({
            section: z.string().describe('Section path below the doc title.'),
            breadcrumb: z.string(),
            startLine: z.number().int(),
            endLine: z.number().int()
        })
        .optional()
        .describe('The section returned, set only when `section` was requested.'),
    outline: z
        .array(
            z.object({
                section: z.string().describe('Pass as `section` to read this entry.'),
                heading: z.string(),
                level: z.number().int().describe('1 for the intro, 2 for ##, 3 for ###.'),
                startLine: z.number().int(),
                endLine: z.number().int().describe('Last line, including nested subsections.'),
                tokens: z.number().int()
            })
        )
        .optional()
        .describe('Headings with line ranges and token counts, set only for outline reads.'),
    matchedAs: z
        .string()
        .optional()
        .describe(
            'The original input as passed by the caller, set only when it differed from the canonical id (e.g. caller passed "grid" and the resolver matched "cmp/grid/README.md"). Diagnostic field for programmatic consumers; absent on exact-match calls.'
        )
});

/** Structured output type for `hoist-read-doc`, derived from the zod schema. */
export type ReadDocOutput = z.infer<typeof readDocOutputSchema>;

/** Arguments shared by `hoist-read-doc` and `hoist-docs read`. */
export interface ReadDocArgs {
    id: string;
    section?: string;
    outline?: boolean;
}

/**
 * Outcome of a read, ready for either surface to emit.
 *
 * `sizeNote` is set on a full read of a large doc and points to `section` and `outline`. It is
 * guidance rather than doc content: the MCP tool prepends it to the text, and the CLI writes it
 * to stderr so stdout stays pure document content.
 */
export type ReadDocResponse =
    | {ok: true; text: string; structured: ReadDocOutput; sizeNote?: string}
    | {ok: false; text: string};

/**
 * Resolve and read a doc - in full, one section, or its outline. The single implementation
 * behind `hoist-read-doc` and `hoist-docs read`, so both surfaces return identical content.
 */
export function readDoc(
    registry: DocEntry[],
    args: ReadDocArgs,
    surface: Surface
): ReadDocResponse {
    const resolved = resolveDocId(registry, args.id);
    if (resolved.kind === 'unknown') {
        const tail =
            resolved.suggestions.length > 0
                ? `Did you mean one of: ${resolved.suggestions.map(s => `"${s}"`).join(', ')}?`
                : surface === 'mcp'
                  ? 'Call hoist-list-docs to see valid IDs, or hoist-search-docs to find one by keyword.'
                  : 'Run "hoist-docs list" to see valid IDs, or "hoist-docs search" to find one by keyword.';
        return {ok: false, text: `Unknown document ID: "${args.id}". ${tail}`};
    }

    const {entry} = resolved,
        matchedAs = resolved.kind === 'normalized' ? resolved.matchedAs : undefined,
        content = loadDocContent(entry),
        base = {
            id: entry.id,
            title: entry.title,
            category: entry.mcpCategory,
            ...(matchedAs != null ? {matchedAs} : {})
        };

    // Full read - unchanged content, with a size note for large docs.
    if (!args.section && !args.outline) {
        const tokens = estimateTokens(content),
            sizeNote =
                tokens > LARGE_DOC_TOKENS
                    ? `This doc is ${formatTokens(tokens)}. ${
                          surface === 'mcp'
                              ? 'Pass outline: true to list its sections, or section: "<heading>" to read one.'
                              : 'Use --outline to list its sections, or --section "<heading>" to read one.'
                      }`
                    : undefined;
        return {
            ok: true,
            text: content,
            structured: {...base, tokens, content},
            sizeNote
        };
    }

    const sections = parseDocSections(entry, content);
    let target: DocSection | undefined;
    if (args.section) {
        const found = resolveSection(entry, sections, args.section);
        if (found.kind !== 'found') {
            return {ok: false, text: formatSectionMiss(entry, sections, args.section, found)};
        }
        target = found.section;
    }

    if (args.outline) {
        const outlined = target ? getSubsections(sections, target) : sections,
            text = formatOutline(entry, content, outlined, surface);
        return {
            ok: true,
            text,
            structured: {
                ...base,
                tokens: target ? target.tokens : estimateTokens(content),
                outline: outlined.map(s => ({
                    section: s.ref,
                    heading: s.heading,
                    level: s.level,
                    startLine: s.startLine,
                    endLine: s.extentEndLine,
                    tokens: s.tokens
                }))
            }
        };
    }

    const s = target!,
        body = getSectionContent(content, s);
    return {
        ok: true,
        text: `[${entry.id} | ${s.breadcrumb} | L${s.startLine}-${s.extentEndLine} | ${formatTokens(s.tokens)}]\n\n${body}`,
        structured: {
            ...base,
            tokens: s.tokens,
            content: body,
            section: {
                section: s.ref,
                breadcrumb: s.breadcrumb,
                startLine: s.startLine,
                endLine: s.extentEndLine
            }
        }
    };
}

/** Format an outline: one indented line per section with its line range and size. */
function formatOutline(
    entry: DocEntry,
    content: string,
    sections: DocSection[],
    surface: Surface
): string {
    const lineCount = splitLines(content).length,
        lines = [
            `Outline of ${entry.id} (${entry.title}, ${formatTokens(estimateTokens(content))}, ${lineCount} lines):`,
            ''
        ];
    for (const s of sections) {
        const indent = s.level === 3 ? '  ' : '';
        lines.push(
            `${indent}- ${s.heading}  L${s.startLine}-${s.extentEndLine}  ${formatTokens(s.tokens)}`
        );
    }
    lines.push(
        '',
        surface === 'mcp'
            ? 'Read one with section: "<heading>". Use "<parent> > <heading>" when a heading repeats.'
            : 'Read one with --section "<heading>". Use "<parent> > <heading>" when a heading repeats.'
    );
    return lines.join('\n');
}

/** Error text for a section that did not resolve: candidates, then the doc outline. */
function formatSectionMiss(
    entry: DocEntry,
    sections: DocSection[],
    input: string,
    result:
        {kind: 'ambiguous'; candidates: DocSection[]} | {kind: 'unknown'; suggestions: DocSection[]}
): string {
    const lines: string[] = [];
    if (result.kind === 'ambiguous') {
        lines.push(
            `Section "${input}" matches ${result.candidates.length} sections in ${entry.id}. Pass the full path of one:`,
            ...result.candidates.map(s => `- "${s.ref}"`)
        );
    } else {
        lines.push(`No section "${input}" in ${entry.id}.`);
        if (result.suggestions.length) {
            lines.push(
                `Did you mean one of: ${result.suggestions.map(s => `"${s.ref}"`).join(', ')}?`
            );
        }
        lines.push('', 'Sections:');
        for (const s of sections) {
            lines.push(`${s.level === 3 ? '  ' : ''}- ${s.heading}`);
        }
    }
    return lines.join('\n');
}

//------------------------------------------------------------------
// List: text
//------------------------------------------------------------------

/** Format a document listing grouped by category. */
export function formatDocList(
    registry: DocEntry[],
    mcpCategories: McpCategory[],
    mcpCategory?: string
): string {
    const filtered =
        mcpCategory && mcpCategory !== 'all'
            ? registry.filter(e => e.mcpCategory === mcpCategory)
            : registry;

    const lines: string[] = [`Hoist Documentation (${filtered.length} documents):\n`];

    for (const cat of mcpCategories) {
        const entries = filtered.filter(e => e.mcpCategory === cat.id);
        if (entries.length === 0) continue;

        lines.push(`## ${cat.title} (${entries.length} doc${entries.length > 1 ? 's' : ''})`);
        for (const entry of entries) {
            lines.push(`- ${entry.id}: ${entry.description}`);
        }
        lines.push('');
    }

    return lines.join('\n');
}
