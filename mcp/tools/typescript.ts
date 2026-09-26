/**
 * MCP tool registrations for hoist-react TypeScript symbol exploration.
 *
 * Provides tools for searching symbols, getting detailed type information, and listing
 * class/interface members. Search runs through `../data/symbol-search.ts`; symbol and member
 * lookups go through the shared implementations in `../formatters/typescript.ts`, which the
 * CLI also uses, so both surfaces return the same content.
 */
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT, searchSymbols} from '../data/symbol-search.js';
import {
    describeMembers,
    describeSymbol,
    formatSymbolSearch,
    getMembersOutputSchema,
    FULL_DETAIL_MAX_MEMBERS,
    getSymbolOutputSchema,
    MAX_SUMMARY_MEMBERS,
    searchNextHint,
    searchSymbolsOutputSchema,
    toSearchSymbolsOutput
} from '../formatters/typescript.js';

const symbolKindSchema = z.enum(['class', 'interface', 'type', 'function', 'const', 'enum']);

const annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
};

/**
 * Register all TypeScript symbol exploration tools on the given MCP server.
 *
 * - `hoist-search-symbols`: Ranked search over symbols and members.
 * - `hoist-get-symbol`: Signature, docs, import path, and member summary for one symbol.
 * - `hoist-get-members`: Filtered member listing for a class or interface.
 *
 * Registration order is the `tools/list` order - keep it stable.
 */
export function registerTsTools(server: McpServer): void {
    //------------------------------------------------------------------
    // Tool: hoist-search-symbols
    //------------------------------------------------------------------
    server.registerTool(
        'hoist-search-symbols',
        {
            title: 'Search Hoist TypeScript Symbols',
            description:
                'Ranked search over hoist-react\'s TypeScript API: classes, interfaces, types, functions, and component factories, plus the members (properties and methods) of every exported class and every *Config / *Spec interface. Use it to find the exact name and public import path of a symbol before writing code, or to find which class or config owns a property (e.g. "headerName" finds ColumnSpec.headerName with its docs). Each hit is one line: kind, name, import path (e.g. @xh/hoist/cmp/grid), and the first sentence of its JSDoc; member hits show Owner.name: type. Default 8 symbols and 8 members, max 20 each. Then call hoist-get-symbol for the signature, full JSDoc, import line, and a member summary, or hoist-get-members with filter for member details. Query tips: one strong keyword works best - an API name like GridModel, persistWith, or headerName. camelCase names match their parts, so "persistWith" also matches "persist". Multi-word queries rank hits by how many terms they match, so extra words narrow rather than exclude. By default impl/, admin/, inspector/, dynamics/ code and non-exported symbols are excluded; pass includeInternal: true to search them. *Props members are returned only when the query names the component or Props interface ("button icon", "ButtonProps"). Pass detail: "full" to include complete JSDoc for every hit (much larger). For how-to and concept questions use hoist-search-docs.',
            inputSchema: z.object({
                query: z
                    .string()
                    .describe(
                        'One strong keyword, ideally an API name (e.g. "GridModel", "persistWith", "headerName"), or a few terms ("StoreRecord raw", "panel collapsed"). camelCase names match their parts.'
                    ),
                kind: symbolKindSchema
                    .optional()
                    .describe(
                        'Restrict symbol results to one kind. Member results are unaffected.'
                    ),
                exported: z
                    .boolean()
                    .optional()
                    .describe(
                        'Exported symbols only. Default: true, or false when includeInternal is true.'
                    ),
                includeInternal: z
                    .boolean()
                    .optional()
                    .describe(
                        'Include impl/, admin/, inspector/, dynamics/ code and non-exported symbols. Default: false'
                    ),
                detail: z
                    .enum(['concise', 'full'])
                    .optional()
                    .describe(
                        'concise (default): one line per hit with the first JSDoc sentence. full: complete JSDoc for every hit.'
                    ),
                limit: z
                    .number()
                    .min(1)
                    .max(MAX_SEARCH_LIMIT)
                    .optional()
                    .describe(
                        `Maximum symbol results and maximum member results (1-${MAX_SEARCH_LIMIT}). Default: ${DEFAULT_SEARCH_LIMIT}`
                    )
            }),
            outputSchema: searchSymbolsOutputSchema,
            annotations
        },
        async ({query, kind, exported, includeInternal, detail, limit}) => {
            const results = await searchSymbols(query, {kind, exported, includeInternal, limit}),
                level = detail ?? 'concise',
                text = `${formatSymbolSearch(results, level)}\n\n${searchNextHint('mcp', results)}`;
            return {
                content: [{type: 'text' as const, text}],
                structuredContent: toSearchSymbolsOutput(results, level)
            };
        }
    );

    //------------------------------------------------------------------
    // Tool: hoist-get-symbol
    //------------------------------------------------------------------
    server.registerTool(
        'hoist-get-symbol',
        {
            title: 'Get Hoist Symbol Details',
            description: `Describe one TypeScript symbol by exact name: its public import line (import {X} from '@xh/hoist/...'), signature, full JSDoc, inheritance, decorators, constructor config type, and source location. For classes and interfaces the result also includes a compact member summary (name: type, own members first, then inherited grouped by declaring type, up to ${MAX_SUMMARY_MEMBERS} lines) - usually enough to pick a property or method without another call; use hoist-get-members with filter for member JSDoc or for the rest. Props interfaces and component factories cross-reference each other. When a name has two declarations in one file (FieldType is both a const and a type) both are returned; pass kind to select one. When the same name exists in several files (View in cmp/viewmanager and data/cube) the result notes the alternates; pass filePath to select one. Use hoist-search-symbols first if you do not know the exact name.`,
            inputSchema: z.object({
                name: z
                    .string()
                    .describe('Exact symbol name (e.g. "GridModel", "ColumnSpec", "fmtNumber")'),
                filePath: z
                    .string()
                    .optional()
                    .describe(
                        'Repo-relative source file path to disambiguate a name declared in several files (e.g. "data/cube/View.ts").'
                    ),
                kind: symbolKindSchema
                    .optional()
                    .describe(
                        'Select one declaration when a name is both a const and a type in one file.'
                    )
            }),
            outputSchema: getSymbolOutputSchema,
            annotations
        },
        async ({name, filePath, kind}) => {
            const result = await describeSymbol({name, filePath, kind}, 'mcp');
            if (!result.ok) {
                return {content: [{type: 'text' as const, text: result.text}], isError: true};
            }
            const text = result.hint ? `${result.text}\n\n${result.hint}` : result.text;
            return {
                content: [{type: 'text' as const, text}],
                structuredContent: result.structured
            };
        }
    );

    //------------------------------------------------------------------
    // Tool: hoist-get-members
    //------------------------------------------------------------------
    server.registerTool(
        'hoist-get-members',
        {
            title: 'Get Hoist Class/Interface Members',
            description: `List the properties, methods, and accessors of a class or interface with types, decorators, defaults, and JSDoc: own members, then members inherited via extends, then members from types outside hoist-react (React, Blueprint), each grouped by declaring type. Narrow with filter (substring of the member name, e.g. "col"), include: "own" | "inherited", and memberKind: "property" | "method" | "accessor". Listings of up to ${FULL_DETAIL_MAX_MEMBERS} members show full JSDoc; larger ones show one line per member unless detail: "full" is passed. React attribute groups are counted and listed only with a filter, so filter: "click" finds onClick on any Props interface. Members without JSDoc inherit it from an implemented interface or the sibling *Spec / *Config. Other symbol kinds return an error naming the right tool. For signature, docs, import, and a member summary in one call use hoist-get-symbol.`,
            inputSchema: z.object({
                name: z
                    .string()
                    .describe(
                        'Class or interface name (e.g. "GridModel", "ColumnSpec", "ButtonProps")'
                    ),
                filePath: z
                    .string()
                    .optional()
                    .describe(
                        'Repo-relative source file path to disambiguate a name declared in several files.'
                    ),
                filter: z
                    .string()
                    .optional()
                    .describe(
                        'Case-insensitive substring to match against member names, e.g. "col" or "click". Also searches external groups.'
                    ),
                include: z
                    .enum(['own', 'inherited', 'all'])
                    .optional()
                    .describe('Own members, inherited members, or both. Default: all'),
                memberKind: z
                    .enum(['property', 'method', 'accessor'])
                    .optional()
                    .describe('Restrict to one member kind. Default: all kinds'),
                detail: z
                    .enum(['full', 'summary'])
                    .optional()
                    .describe(
                        `full: complete JSDoc per member. summary: one line per member with the first sentence. Default: full for up to ${FULL_DETAIL_MAX_MEMBERS} members, summary above that.`
                    )
            }),
            outputSchema: getMembersOutputSchema,
            annotations
        },
        async ({name, filePath, filter, include, memberKind, detail}) => {
            const result = await describeMembers(
                {name, filePath, filter, include, memberKind, detail},
                'mcp'
            );
            if (!result.ok) {
                return {content: [{type: 'text' as const, text: result.text}], isError: true};
            }
            return {
                content: [{type: 'text' as const, text: `${result.text}\n\n${result.hint}`}],
                structuredContent: result.structured
            };
        }
    );
}
