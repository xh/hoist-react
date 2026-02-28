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
    type MemberInfo,
    type MemberIndexEntry
} from '../data/ts-registry.js';
import {resolveRepoRoot} from '../util/paths.js';

/** Maximum length for type strings before truncation. */
const MAX_TYPE_LENGTH = 200;

/** Truncate a type string if it exceeds MAX_TYPE_LENGTH. */
function truncateType(typeStr: string): string {
    return typeStr.length > MAX_TYPE_LENGTH ? typeStr.slice(0, MAX_TYPE_LENGTH) + '...' : typeStr;
}

/** Convert an absolute file path to a repo-relative path. */
function toRelativePath(filePath: string): string {
    const root = resolveRepoRoot();
    return filePath.startsWith(root) ? filePath.slice(root.length + 1) : filePath;
}

/**
 * Format a member as a readable line with optional decorator prefix and JSDoc description.
 * e.g. `\@observable columns: ColumnOrGroup[]`
 *      `    Columns displayed in the grid.`
 */
function formatMember(member: MemberInfo): string {
    const lines: string[] = [];
    const decoratorPrefix =
        member.decorators.length > 0 ? member.decorators.map(d => `@${d}`).join(' ') + ' ' : '';

    if (member.kind === 'method') {
        const params = (member.parameters ?? [])
            .map(p => `${p.name}: ${truncateType(p.type)}`)
            .join(', ');
        const ret = member.returnType ? truncateType(member.returnType) : 'void';
        lines.push(`- ${decoratorPrefix}${member.name}(${params}): ${ret}`);
    } else {
        lines.push(`- ${decoratorPrefix}${member.name}: ${truncateType(member.type)}`);
    }

    if (member.jsDoc) {
        lines.push(`    ${member.jsDoc.split('\n')[0]}`);
    }

    return lines.join('\n');
}

/**
 * Format a MemberIndexEntry as a readable line for search results.
 * e.g. `1. [accessor] lastLoadCompleted: Date (on HoistModel — base class for all application models)`
 *      `    Timestamp of most recent successful load completion`
 */
function formatMemberIndexEntry(entry: MemberIndexEntry, index: number): string {
    const lines: string[] = [];
    const staticPrefix = entry.isStatic ? 'static ' : '';
    const typeStr = truncateType(entry.type);
    lines.push(
        `${index}. [${entry.memberKind}] ${staticPrefix}${entry.name}: ${typeStr} (on ${entry.ownerName} \u2014 ${entry.ownerDescription})`
    );
    if (entry.jsDoc) {
        lines.push(`    ${entry.jsDoc}`);
    }
    return lines.join('\n');
}

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

            // Search members with a separate cap; if no symbols match, give
            // members more room so the query is still useful.
            const memberLimit = symbolResults.length === 0 ? symbolLimit : 15;
            const memberResults = await searchMembers(query, {limit: memberLimit});

            const lines: string[] = [];

            if (symbolResults.length > 0) {
                lines.push(`Symbols (${symbolResults.length} matches):\n`);
                symbolResults.forEach((result, i) => {
                    lines.push(
                        `${i + 1}. [${result.kind}] ${result.name} (package: ${result.sourcePackage}, file: ${toRelativePath(result.filePath)}, exported: ${result.isExported ? 'yes' : 'no'})`
                    );
                });
            }

            if (memberResults.length > 0) {
                if (lines.length > 0) lines.push('');
                lines.push(`Members of key classes (${memberResults.length} matches):\n`);
                memberResults.forEach((m, i) => {
                    lines.push(formatMemberIndexEntry(m, i + 1));
                });
            }

            if (lines.length > 0) {
                lines.push('');
                lines.push('Tip: Use hoist-get-members to see all members of a specific class.');
            }

            const text =
                lines.length > 0
                    ? lines.join('\n')
                    : `No symbols or members found matching '${query}'. Try a broader search term.`;

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

            let text: string;
            if (!detail) {
                text = `Symbol '${name}' not found. Use hoist-search-symbols to find available symbols.`;
            } else {
                const lines: string[] = [
                    `# ${detail.name} (${detail.kind})`,
                    `Package: ${detail.sourcePackage}`,
                    `File: ${toRelativePath(detail.filePath)}`,
                    `Exported: ${detail.isExported ? 'yes' : 'no'}`
                ];

                if (detail.extends) {
                    lines.push(`Extends: ${detail.extends}`);
                }
                if (detail.implements && detail.implements.length > 0) {
                    lines.push(`Implements: ${detail.implements.join(', ')}`);
                }
                if (detail.decorators && detail.decorators.length > 0) {
                    lines.push(`Decorators: ${detail.decorators.map(d => `@${d}`).join(', ')}`);
                }

                lines.push('');
                lines.push('## Signature');
                lines.push(detail.signature);

                if (detail.jsDoc) {
                    lines.push('');
                    lines.push('## Documentation');
                    lines.push(detail.jsDoc);
                }

                if (detail.kind === 'class' || detail.kind === 'interface') {
                    lines.push('');
                    lines.push('Use hoist-get-members to see all properties and methods.');
                }

                text = lines.join('\n');
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

            let text: string;
            if (!result) {
                text = `Symbol '${name}' not found or is not a class/interface. Use hoist-search-symbols to find the correct symbol name.`;
            } else {
                const {members} = result;

                // Group members by category
                const instanceProps = members.filter(
                    m => !m.isStatic && (m.kind === 'property' || m.kind === 'accessor')
                );
                const instanceMethods = members.filter(m => !m.isStatic && m.kind === 'method');
                const staticProps = members.filter(
                    m => m.isStatic && (m.kind === 'property' || m.kind === 'accessor')
                );
                const staticMethods = members.filter(m => m.isStatic && m.kind === 'method');

                const lines: string[] = [`# ${name} Members\n`];

                if (instanceProps.length > 0) {
                    lines.push(`## Properties (${instanceProps.length})`);
                    for (const prop of instanceProps) {
                        lines.push(formatMember(prop));
                    }
                    lines.push('');
                }

                if (instanceMethods.length > 0) {
                    lines.push(`## Methods (${instanceMethods.length})`);
                    for (const method of instanceMethods) {
                        lines.push(formatMember(method));
                    }
                    lines.push('');
                }

                if (staticProps.length > 0) {
                    lines.push(`## Static Properties (${staticProps.length})`);
                    for (const prop of staticProps) {
                        lines.push(formatMember(prop));
                    }
                    lines.push('');
                }

                if (staticMethods.length > 0) {
                    lines.push(`## Static Methods (${staticMethods.length})`);
                    for (const method of staticMethods) {
                        lines.push(formatMember(method));
                    }
                    lines.push('');
                }

                if (members.length === 0) {
                    lines.push('No members found.');
                }

                text = lines.join('\n');
            }

            return {content: [{type: 'text' as const, text}]};
        }
    );
}
