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
    ensureInitialized,
    searchSymbols,
    getSymbolDetail,
    getMembers,
    type MemberInfo
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
 * e.g. "@observable columns: ColumnOrGroup[]"
 *      "    Columns displayed in the grid."
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
                'Search for TypeScript classes, interfaces, types, and functions across the hoist-react framework by name. Returns matching symbols with their kind, source file, and package. Use this to find symbols before getting detailed information.',
            inputSchema: z.object({
                query: z
                    .string()
                    .describe(
                        'Symbol name or partial name to search for (e.g. "GridModel", "Store", "Panel")'
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
            ensureInitialized();
            const results = searchSymbols(query, {
                kind,
                exported: exported ?? true,
                limit: limit ?? 20
            });

            let text: string;
            if (results.length === 0) {
                text = `No symbols found matching '${query}'. Try a broader search term.`;
            } else {
                const lines = [`Found ${results.length} symbols matching '${query}':\n`];
                results.forEach((result, i) => {
                    lines.push(
                        `${i + 1}. [${result.kind}] ${result.name} (package: ${result.sourcePackage}, file: ${toRelativePath(result.filePath)}, exported: ${result.isExported ? 'yes' : 'no'})`
                    );
                });
                text = lines.join('\n');
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
            ensureInitialized();
            const detail = getSymbolDetail(name, filePath);

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
            ensureInitialized();
            const result = getMembers(name, filePath);

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
