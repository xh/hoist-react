/**
 * MCP tool registrations for hoist-react documentation.
 *
 * Provides tools for searching and listing documentation, plus a connectivity
 * ping. All doc data is loaded from the registry built in `../data/doc-registry.ts`.
 */
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {buildRegistry, searchDocs, loadDocContent} from '../data/doc-registry.js';
import {
    formatSearchResults,
    formatDocList,
    searchDocsOutputSchema,
    toSearchDocsOutput,
    listDocsOutputSchema,
    toListDocsOutput,
    readDocOutputSchema,
    toReadDocOutput
} from '../formatters/docs.js';
import {resolveRepoRoot, resolveHoistVersion} from '../util/paths.js';

/**
 * Register all documentation tools on the given MCP server.
 *
 * - `hoist-search-docs`: Search across all docs by keyword.
 * - `hoist-list-docs`: List all available docs with descriptions.
 * - `hoist-read-doc`: Read the full body of a single doc by ID.
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
                'Search across all hoist-react documentation (package READMEs, concept docs, upgrade notes, conventions) by keyword. Returns matching documents with short context snippets showing where terms appear — not full document text. To read a specific doc in full, call hoist-read-doc with an ID from the results (or fetch the hoist://docs/{id} resource). To browse the catalog without a query, call hoist-list-docs. For TypeScript type information rather than narrative docs, use hoist-search-symbols.',
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
            outputSchema: searchDocsOutputSchema,
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
            const structuredContent = toSearchDocsOutput(query, results);
            return {
                content: [{type: 'text' as const, text}],
                structuredContent
            };
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
                'List all available hoist-react documentation grouped by category, with title and description for each entry. Returns the catalog only — not full document text. To read a specific doc, call hoist-read-doc with its ID (or fetch the hoist://docs/{id} resource). For keyword-based discovery across doc content, use hoist-search-docs instead.',
            inputSchema: z.object({
                category: categoryEnum
            }),
            outputSchema: listDocsOutputSchema,
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
            const structuredContent = toListDocsOutput(registry, mcpCategories, category);
            return {
                content: [{type: 'text' as const, text}],
                structuredContent
            };
        }
    );

    //------------------------------------------------------------------
    // Tool: hoist-read-doc
    //------------------------------------------------------------------
    server.registerTool(
        'hoist-read-doc',
        {
            title: 'Read Hoist Documentation',
            description:
                'Read the full text of a single hoist-react document by its exact ID (e.g. "cmp/grid/README.md", "docs/authentication.md"). Get IDs from hoist-search-docs or hoist-list-docs. This is the tool-based equivalent of the hoist://docs/{id} resource — prefer it when resource fetching is unavailable or inconvenient. For keyword discovery rather than a known ID, use hoist-search-docs.',
            inputSchema: z.object({
                id: z
                    .string()
                    .describe(
                        'Exact document ID (its repo-relative path) from search or list output, e.g. "cmp/grid/README.md" or "docs/authentication.md".'
                    )
            }),
            outputSchema: readDocOutputSchema,
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            }
        },
        async ({id}) => {
            const entry = registry.find(e => e.id === id);
            if (!entry) {
                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: `Unknown document ID: "${id}". Call hoist-list-docs to see valid IDs, or hoist-search-docs to find one by keyword.`
                        }
                    ],
                    isError: true
                };
            }

            const content = loadDocContent(entry);
            return {
                content: [{type: 'text' as const, text: content}],
                structuredContent: toReadDocOutput(entry, content)
            };
        }
    );

    //------------------------------------------------------------------
    // Tool: hoist-ping
    //------------------------------------------------------------------
    server.registerTool(
        'hoist-ping',
        {
            title: 'Hoist Ping',
            description:
                'Verify the Hoist MCP server is running and responsive. Reports the indexed @xh/hoist library version.',
            inputSchema: z.object({})
        },
        async () => ({
            content: [
                {
                    type: 'text' as const,
                    text: `Hoist MCP server is running (@xh/hoist v${resolveHoistVersion()}).`
                }
            ]
        })
    );
}
