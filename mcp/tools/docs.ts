/**
 * MCP tool registrations for hoist-react documentation.
 *
 * Provides tools for searching, listing, and reading documentation, plus a connectivity
 * ping. All doc data is loaded from the registry built in `../data/doc-registry.ts`. Search
 * and section reads share the section model in `../data/doc-sections.ts`.
 */
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {buildRegistry} from '../data/doc-registry.js';
import {DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT, searchDocs} from '../data/doc-search.js';
import {
    formatSearchResults,
    formatDocList,
    readDoc,
    searchDocsOutputSchema,
    searchReadHint,
    toSearchDocsOutput,
    listDocsOutputSchema,
    toListDocsOutput,
    readDocOutputSchema
} from '../formatters/docs.js';
import {resolveRepoRoot, resolveHoistVersion} from '../util/paths.js';

/**
 * Register all documentation tools on the given MCP server.
 *
 * - `hoist-search-docs`: Ranked section-level search across all docs.
 * - `hoist-list-docs`: List all available docs with descriptions.
 * - `hoist-read-doc`: Read a doc in full, one section, or its outline.
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
                'Search hoist-react documentation (package READMEs, concept docs, conventions, upgrade notes) and return the best-matching sections, ranked. Each result gives the doc id, the section path, its line range and size in tokens, and a short excerpt from the start of the section. Returns 5 results by default, at most 2 per doc. To read a result, call hoist-read-doc with its id and section - that returns just the section, usually a few hundred tokens, instead of the whole doc. Use this tool for how-to and concept questions (e.g. masking a panel while loading, persisting grid state). For exact class, method, or prop signatures, use hoist-search-symbols instead. Query tips: send two to four keywords rather than a sentence, and prefer the names the docs use - API names like "persistWith", "XH.confirm", or "GridModel" beat paraphrases like "save state". camelCase names also match their parts, so "persistWith" finds text about "persist".',
            inputSchema: z.object({
                query: z
                    .string()
                    .describe(
                        'Two to four keywords, ideally the API or concept names the docs use (e.g. "grid column renderer", "persistWith", "mask panel loading").'
                    ),
                category: categoryEnum,
                limit: z
                    .number()
                    .min(1)
                    .max(MAX_SEARCH_LIMIT)
                    .optional()
                    .describe(
                        `Maximum number of sections to return (1-${MAX_SEARCH_LIMIT}). Default: ${DEFAULT_SEARCH_LIMIT}`
                    )
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
            const results = searchDocs(registry, query, {category, limit});

            let text = formatSearchResults(results, query);
            if (results.length > 0) text += `\n\n${searchReadHint('mcp')}`;
            return {
                content: [{type: 'text' as const, text}],
                structuredContent: toSearchDocsOutput(query, results)
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
                'Read a hoist-react doc - one section, its outline, or the whole doc. Pass section (a heading or path from hoist-search-docs results, e.g. "Built-in Model Support > GridModel") to get just that section and its subsections - the cheapest way to read a search hit. Pass outline: true to get the doc\'s headings with line ranges and token counts and no body - useful for picking a section in a large doc. With neither, returns the full doc; docs over ~3k tokens start with a one-line size note. Accepts the canonical ID (e.g. "cmp/grid/README.md", "docs/authentication.md") and also tolerates common shortenings: a bare subsystem ("core" → "core/README.md"), a path without README ("cmp/grid"), a docs/ path without prefix ("authentication"), a last-segment shortcut ("grid"), or a version code for upgrade notes ("v85"). Section names match case-insensitively, ignore punctuation, and accept a unique prefix; an unknown section returns the doc\'s headings with suggestions. To find a doc or section by topic, use hoist-search-docs first.',
            inputSchema: z.object({
                id: z
                    .string()
                    .describe(
                        'Document ID. Prefer the canonical repo-relative path from search or list output (e.g. "cmp/grid/README.md"). The resolver also accepts common shortenings -- see the tool description.'
                    ),
                section: z
                    .string()
                    .optional()
                    .describe(
                        'Heading or path of one section to read, e.g. "Mask" or "Built-in Model Support > GridModel". Use the `section` value from hoist-search-docs results. Returns the section with its subsections.'
                    ),
                outline: z
                    .boolean()
                    .optional()
                    .describe(
                        "Return the doc's headings with line ranges and token counts instead of its content. Combine with section to outline just that section."
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
        async ({id, section, outline}) => {
            const result = readDoc(registry, {id, section, outline}, 'mcp');
            if (!result.ok) {
                return {content: [{type: 'text' as const, text: result.text}], isError: true};
            }

            const text = result.sizeNote ? `${result.sizeNote}\n\n${result.text}` : result.text;
            return {
                content: [{type: 'text' as const, text}],
                structuredContent: result.structured
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
