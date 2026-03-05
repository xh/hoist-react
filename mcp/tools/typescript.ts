/**
 * MCP tool registrations for hoist-react TypeScript symbol exploration.
 *
 * Provides tools for searching symbols, getting detailed type information, and
 * listing class/interface members. All data is extracted from the ts-morph
 * registry built in `../data/ts-registry.ts`.
 */
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';

import {searchSymbols, searchMembers, getSymbolDetail, getMembers} from '../data/ts-registry.js';
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
                'Search for TypeScript classes, interfaces, types, and functions across the hoist-react framework by name. Also searches public members (properties, methods, accessors) of key framework classes like HoistModel, GridModel, Store, and others. Returns matching symbols and members with their kind, source, and context.',
            inputSchema: z.object({
                query: z
                    .string()
                    .describe(
                        'Symbol or member name to search for (e.g. "GridModel", "Store", "lastLoadCompleted", "setSortBy")'
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
                'Get detailed type information for a specific TypeScript symbol including its full signature, JSDoc documentation, inheritance, and source location. Use hoist-search-symbols first to find the symbol name.',
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
            let text = formatSymbolDetail(detail, name);

            if (detail && (detail.kind === 'class' || detail.kind === 'interface')) {
                text += '\n\nUse hoist-get-members to see all properties and methods.';
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
                'List all properties and methods of a class or interface with their types, decorators, and documentation. Use hoist-search-symbols or hoist-get-symbol first to identify the target symbol.',
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
            const text = formatMembers(result, name);
            return {content: [{type: 'text' as const, text}]};
        }
    );
}
