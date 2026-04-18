/**
 * Shared formatting and projection functions for documentation search and
 * listing results.
 *
 * Used by both the MCP tools (`tools/docs.ts`) and the CLI (`cli/docs.ts`)
 * to produce identical output from the same data. Offers two projections of
 * each result set:
 * - Text -- human-readable block for CLI stdout and MCP text content.
 * - Structured -- typed JSON shape for MCP `structuredContent` and CLI
 *   `--json` output. Shape is validated by the exported zod schema.
 */
import {z} from 'zod';
import type {DocEntry, McpCategory, SearchResult} from '../data/doc-registry.js';

/** Format search results as a readable text block. */
export function formatSearchResults(results: SearchResult[], query: string): string {
    if (results.length === 0) {
        return `No documents matched your search for "${query}".`;
    }

    const lines = [
        `Found ${results.length} result${results.length > 1 ? 's' : ''} for "${query}":\n`
    ];
    results.forEach((result, i) => {
        lines.push(
            `${i + 1}. [${result.entry.title}] (id: ${result.entry.id}, category: ${result.entry.mcpCategory})`
        );
        lines.push(`   ${result.entry.description}`);
        lines.push(`   Matches: ${result.matchCount} | Snippets:`);
        for (const snippet of result.snippets) {
            lines.push(`   - L${snippet.lineNumber}: ${snippet.text}`);
        }
        lines.push('');
    });
    return lines.join('\n');
}

//------------------------------------------------------------------
// Structured output: hoist-search-docs
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
                        'Document ID, also its path relative to the repo root. Pass to `hoist-docs read <id>` or fetch `hoist://docs/{id}`.'
                    ),
                title: z.string(),
                category: z.string().describe('MCP category ID (e.g. "package", "concept").'),
                description: z.string(),
                matchCount: z
                    .number()
                    .int()
                    .describe('Total keyword hits across metadata and content.'),
                snippets: z.array(
                    z.object({
                        lineNumber: z.number().int().describe('1-based line number in the source.'),
                        text: z
                            .string()
                            .describe('Matching line, trimmed and truncated to 200 chars.')
                    })
                )
            })
        )
        .describe('Results sorted by matchCount descending.')
});

/** Structured output type for `hoist-search-docs`, derived from the zod schema. */
export type SearchDocsOutput = z.infer<typeof searchDocsOutputSchema>;

/**
 * Project internal `SearchResult[]` into the public structured output shape.
 *
 * Strips server-internal fields (absolute `filePath`, raw keyword arrays) and
 * flattens `entry.*` up to the result level so downstream consumers do not
 * need to know about the internal entry/match split.
 */
export function toSearchDocsOutput(query: string, results: SearchResult[]): SearchDocsOutput {
    return {
        query,
        resultCount: results.length,
        results: results.map(r => ({
            id: r.entry.id,
            title: r.entry.title,
            category: r.entry.mcpCategory,
            description: r.entry.description,
            matchCount: r.matchCount,
            snippets: r.snippets
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
