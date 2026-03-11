/**
 * MCP tool registrations for hoist-react documentation.
 *
 * Provides tools for searching and listing documentation, plus a connectivity
 * ping. All doc data is loaded from the registry built in `../data/doc-registry.ts`.
 */
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {buildRegistry, searchDocs} from '../data/doc-registry.js';
import {formatSearchResults, formatDocList} from '../formatters/docs.js';
import {resolveRepoRoot} from '../util/paths.js';

/**
 * Register all documentation tools on the given MCP server.
 *
 * - `hoist-search-docs`: Search across all docs by keyword.
 * - `hoist-list-docs`: List all available docs with descriptions.
 * - `hoist-ping`: Connectivity test.
 */
export function registerDocTools(server: McpServer): void {
    const {entries: registry, mcpCategories} = buildRegistry(resolveRepoRoot());
    const categoryIds = mcpCategories.map(c => c.id);

    /** Valid category values for tool input schemas. */
    const categoryEnum = z
        .enum([...(categoryIds as [string, ...string[]]), 'all'])
        .optional()
        .describe('Filter by category. Default: all');

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
                mcpCategory: category ?? undefined,
                limit: limit ?? 10
            });

            const text = formatSearchResults(results, query);
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
            let text = formatDocList(registry, mcpCategories, category ?? undefined);
            text += 'Read any document using its ID with the hoist://docs/{id} resource.';
            return {content: [{type: 'text' as const, text}]};
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
