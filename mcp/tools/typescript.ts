/**
 * MCP tool registrations for hoist-react TypeScript symbol exploration.
 *
 * Provides tools for searching symbols, getting detailed type information, and
 * listing class/interface members. All data is extracted from the ts-morph
 * registry built in `../data/ts-registry.ts`.
 */
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {
    searchSymbols,
    searchMembers,
    getSymbolDetail,
    getMembers,
    getCompanionSymbols,
    findAlternateEntries
} from '../data/ts-registry.js';
import {formatSymbolSearch, formatSymbolDetail, formatMembers} from '../formatters/typescript.js';

/**
 * Register all TypeScript symbol exploration tools on the given MCP server.
 *
 * - `hoist-search-symbols`: Search for symbols by name.
 * - `hoist-get-symbol`: Get detailed type info for a specific symbol.
 * - `hoist-get-members`: List all members of a class or interface.
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
                'Search for TypeScript classes, interfaces, types, and functions across the hoist-react framework by name, JSDoc content, and own member names. Multi-word queries match all terms (AND logic) — e.g. "panel modal" finds ModalSupportModel via its JSDoc, "StoreRecord raw" finds StoreRecord via its raw property. Also searches public members of every exported class and every exported `*Config` interface by owner name, member name, and member JSDoc. Results are ranked: name matches above JSDoc/member-only matches. Returns matches with short context snippets only — for full type information on a match, call hoist-get-symbol; for a complete property/method list, call hoist-get-members. Use hoist-search-docs for narrative documentation rather than type info.',
            inputSchema: z.object({
                query: z
                    .string()
                    .describe(
                        'Search query — a symbol name (e.g. "GridModel"), a keyword (e.g. "tooltip"), a class + member name (e.g. "StoreRecord raw"), or multiple terms (e.g. "panel modal", "cube view store")'
                    ),
                kind: z
                    .enum(['class', 'interface', 'type', 'function', 'const', 'enum'])
                    .optional()
                    .describe('Filter by symbol kind. Default: all kinds'),
                exported: z
                    .boolean()
                    .optional()
                    .describe('Filter to exported symbols only. Default: true'),
                limit: z.number().min(1).max(50).optional().describe('Maximum results. Default: 20')
            }),
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            }
        },
        async ({query, kind, exported, limit}) => {
            const symbolLimit = limit ?? 20;
            const symbolResults = await searchSymbols(query, {
                kind,
                exported: exported ?? true,
                limit: symbolLimit
            });

            const memberLimit = symbolResults.length === 0 ? symbolLimit : 15;
            const memberResults = await searchMembers(query, {limit: memberLimit});

            let text = formatSymbolSearch(symbolResults, memberResults, query);
            if (symbolResults.length > 0 || memberResults.length > 0) {
                text += '\n\nTip: Use hoist-get-members to see all members of a specific class.';
            }

            return {content: [{type: 'text' as const, text}]};
        }
    );

    //------------------------------------------------------------------
    // Tool: hoist-get-symbol
    //------------------------------------------------------------------
    server.registerTool(
        'hoist-get-symbol',
        {
            title: 'Get Hoist Symbol Details',
            description:
                'Get detailed type information for a specific TypeScript symbol: full signature, JSDoc documentation, inheritance chain, decorators, and source location. Returns the declaration and doc-block only — for the full property/method list of a class or interface (including inherited members), call hoist-get-members instead. Use hoist-search-symbols first if you do not already have the exact symbol name.',
            inputSchema: z.object({
                name: z
                    .string()
                    .describe('Exact symbol name (e.g. "GridModel", "Store", "HoistModel")'),
                filePath: z
                    .string()
                    .optional()
                    .describe(
                        'Source file path to disambiguate if multiple symbols share the same name'
                    )
            }),
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            }
        },
        async ({name, filePath}) => {
            const detail = await getSymbolDetail(name, filePath);
            const companions = detail ? await getCompanionSymbols(detail) : [];
            let text = formatSymbolDetail(detail, name, companions);

            if (detail && (detail.kind === 'class' || detail.kind === 'interface')) {
                text += '\n\nUse hoist-get-members to see all properties and methods.';
            }

            if (detail && !filePath) {
                const alternates = findAlternateEntries(name, detail.filePath);
                if (alternates.length > 0) {
                    const altList = alternates
                        .map(
                            a =>
                                `  - [${a.kind}] ${a.sourcePackage} (${a.filePath.replace(/.*\/hoist-react\//, '')})`
                        )
                        .join('\n');
                    text += `\n\nNote: ${alternates.length + 1} symbols named "${name}" exist. Pass filePath to disambiguate:\n${altList}`;
                }
            }

            return {content: [{type: 'text' as const, text}]};
        }
    );

    //------------------------------------------------------------------
    // Tool: hoist-get-members
    //------------------------------------------------------------------
    server.registerTool(
        'hoist-get-members',
        {
            title: 'Get Hoist Class/Interface Members',
            description:
                'List all properties and methods of a class or interface with types, decorators, and JSDoc. Walks the full inheritance chain (extends / implements) and tags inherited members with their declaring type — essential for framework classes with deep hierarchies (e.g. DashContainerModel inherits from DashModel) and for Props interfaces that compose multiple parents. For just the declaration signature and top-level JSDoc without the member list, call hoist-get-symbol instead. Use hoist-search-symbols first if you do not already have the exact name.',
            inputSchema: z.object({
                name: z
                    .string()
                    .describe('Class or interface name (e.g. "GridModel", "HoistModel")'),
                filePath: z
                    .string()
                    .optional()
                    .describe(
                        'Source file path to disambiguate if multiple symbols share the same name'
                    )
            }),
            annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true,
                openWorldHint: false
            }
        },
        async ({name, filePath}) => {
            const result = await getMembers(name, filePath);
            let text = formatMembers(result, name);

            if (result && !filePath) {
                const alternates = findAlternateEntries(name, result.symbol.filePath);
                if (alternates.length > 0) {
                    const altList = alternates
                        .map(
                            a =>
                                `  - [${a.kind}] ${a.sourcePackage} (${a.filePath.replace(/.*\/hoist-react\//, '')})`
                        )
                        .join('\n');
                    text += `\n\nNote: ${alternates.length + 1} symbols named "${name}" exist. Pass filePath to disambiguate:\n${altList}`;
                }
            }

            return {content: [{type: 'text' as const, text}]};
        }
    );
}
