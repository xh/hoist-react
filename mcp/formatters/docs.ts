/**
 * Shared formatting functions for documentation search and listing results.
 *
 * Used by both the MCP tools (`tools/docs.ts`) and the CLI (`cli/docs.ts`)
 * to produce identical output from the same data.
 */
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
