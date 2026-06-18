/**
 * MCP tool registrations for hoist-react documentation.
 *
 * Provides tools for searching and listing documentation, plus a connectivity
 * ping. All doc data is loaded from the registry built in `../data/doc-registry.ts`.
 */
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {buildRegistry, searchDocs, loadDocContent} from '../data/doc-registry.js';
import {resolveDocId} from '../data/doc-id-resolver.js';
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
                'Read the full text of a single hoist-react document. Accepts the canonical ID (e.g. "cmp/grid/README.md", "docs/authentication.md") and also tolerates common shortenings: a bare subsystem ("core" → "core/README.md"), a path without README ("cmp/grid"), a docs/ path without prefix ("authentication"), a last-segment shortcut ("grid"), or a version code for upgrade notes ("v85"). For keyword discovery rather than a known ID, use hoist-search-docs.',
            inputSchema: z.object({
                id: z
                    .string()
                    .describe(
                        'Document ID. Prefer the canonical repo-relative path from search or list output (e.g. "cmp/grid/README.md"). The resolver also accepts common shortenings -- see the tool description.'
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
            const result = resolveDocId(registry, id);
            if (result.kind === 'unknown') {
                const tail =
                    result.suggestions.length > 0
                        ? ` Did you mean one of: ${result.suggestions.map(s => `"${s}"`).join(', ')}?`
                        : ' Call hoist-list-docs to see valid IDs, or hoist-search-docs to find one by keyword.';
                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: `Unknown document ID: "${id}".${tail}`
                        }
                    ],
                    isError: true
                };
            }

            const entry = result.entry;
            const matchedAs = result.kind === 'normalized' ? result.matchedAs : undefined;
            const content = loadDocContent(entry);
            return {
                content: [{type: 'text' as const, text: content}],
                structuredContent: toReadDocOutput(entry, content, matchedAs)
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
