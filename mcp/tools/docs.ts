/**
 * MCP tool registrations for hoist-react documentation.
 *
 * Provides tools for searching and listing documentation, plus a connectivity
 * ping. All doc data is loaded from the registry built in `../data/doc-registry.ts`.
 */
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {buildRegistry, searchDocs, type DocCategory} from '../data/doc-registry.js';
import {resolveRepoRoot} from '../util/paths.js';

/** Valid category values for tool input schemas. */
const categoryEnum = z
    .enum(['package', 'concept', 'devops', 'conventions', 'all'])
    .optional()
    .describe('Filter by category. Default: all');

/** Display order for categories in the list output. */
const CATEGORY_ORDER: DocCategory[] = ['package', 'concept', 'devops', 'conventions', 'index'];
const CATEGORY_LABELS: Record<DocCategory, string> = {
    package: 'Package Documentation',
    concept: 'Concept Documentation',
    devops: 'DevOps Documentation',
    conventions: 'Conventions',
    index: 'Index'
};

/**
 * Register all documentation tools on the given MCP server.
 *
 * - `hoist-search-docs`: Search across all docs by keyword.
 * - `hoist-list-docs`: List all available docs with descriptions.
 * - `hoist-ping`: Connectivity test.
 */
export function registerDocTools(server: McpServer): void {
    const registry = buildRegistry(resolveRepoRoot());

    //------------------------------------------------------------------
    // Tool: hoist-search-docs
    //------------------------------------------------------------------
    server.registerTool(
        'hoist-search-docs',
        {
            title: 'Search Hoist Documentation',
            description:
                'Search across all hoist-react documentation by keyword. Returns matching documents with context snippets showing where terms appear. Use this to find relevant docs when you do not know the exact document name.',
            inputSchema: z.object({
                query: z
                    .string()
                    .describe(
                        'Search keywords (e.g. "grid column sorting", "authentication OAuth")'
                    ),
                category: categoryEnum,
                limit: z
                    .number()
                    .min(1)
                    .max(20)
                    .optional()
                    .describe('Maximum number of results. Default: 10')
            }),
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            }
        },
        async ({query, category, limit}) => {
            const results = searchDocs(registry, query, {
                category: category as DocCategory | 'all' | undefined,
                limit: limit ?? 10
            });

            let text: string;
            if (results.length === 0) {
                text = `No documents matched your search for "${query}".`;
            } else {
                const lines = [
                    `Found ${results.length} result${results.length > 1 ? 's' : ''} for "${query}":\n`
                ];
                results.forEach((result, i) => {
                    lines.push(
                        `${i + 1}. [${result.entry.title}] (id: ${result.entry.id}, category: ${result.entry.category})`
                    );
                    lines.push(`   ${result.entry.description}`);
                    lines.push(`   Matches: ${result.matchCount} | Snippets:`);
                    for (const snippet of result.snippets) {
                        lines.push(`   - L${snippet.lineNumber}: ${snippet.text}`);
                    }
                    lines.push('');
                });
                text = lines.join('\n');
            }

            return {content: [{type: 'text' as const, text}]};
        }
    );

    //------------------------------------------------------------------
    // Tool: hoist-list-docs
    //------------------------------------------------------------------
    server.registerTool(
        'hoist-list-docs',
        {
            title: 'List Hoist Documentation',
            description:
                'List all available hoist-react documentation with descriptions and categories. Use this to discover what docs are available before reading specific ones.',
            inputSchema: z.object({
                category: categoryEnum
            }),
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            }
        },
        async ({category}) => {
            const filtered =
                category && category !== 'all'
                    ? registry.filter(e => e.category === category)
                    : registry;

            const lines: string[] = [`Hoist Documentation (${filtered.length} documents):\n`];

            // Group by category in display order.
            for (const cat of CATEGORY_ORDER) {
                const entries = filtered.filter(e => e.category === cat);
                if (entries.length === 0) continue;

                lines.push(
                    `## ${CATEGORY_LABELS[cat]} (${entries.length} doc${entries.length > 1 ? 's' : ''})`
                );
                for (const entry of entries) {
                    lines.push(`- ${entry.id}: ${entry.description}`);
                }
                lines.push('');
            }

            lines.push('Read any document using its ID with the hoist://docs/{id} resource.');

            return {content: [{type: 'text' as const, text: lines.join('\n')}]};
        }
    );

    //------------------------------------------------------------------
    // Tool: hoist-ping
    //------------------------------------------------------------------
    server.registerTool(
        'hoist-ping',
        {
            title: 'Hoist Ping',
            description: 'Verify the Hoist MCP server is running and responsive',
            inputSchema: z.object({})
        },
        async () => ({
            content: [{type: 'text' as const, text: 'Hoist MCP server is running.'}]
        })
    );
}
