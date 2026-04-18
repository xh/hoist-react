/**
 * Shared formatting and projection functions for TypeScript symbol and member
 * results.
 *
 * Used by both the MCP tools (`tools/typescript.ts`) and the CLI (`cli/ts.ts`)
 * to produce identical output from the same data. Offers two projections of
 * each result set:
 * - Text -- human-readable block for CLI stdout and MCP text content.
 * - Structured -- typed JSON shape for MCP `structuredContent` and CLI
 *   `--json` output. Shape is validated by the exported zod schemas.
 */
import {z} from 'zod';
import type {MemberInfo, MemberIndexEntry, SymbolEntry, SymbolDetail} from '../data/ts-registry.js';
import {resolveRepoRoot} from '../util/paths.js';

/** Remove blank lines from a JSDoc string to produce more compact output. */
function collapseJsDoc(jsDoc: string): string {
    return jsDoc
        .split('\n')
        .filter(l => l.trim().length > 0)
        .join('\n');
}

/** Maximum length for type strings before truncation. */
const MAX_TYPE_LENGTH = 200;

/** Truncate a type string if it exceeds MAX_TYPE_LENGTH. */
export function truncateType(typeStr: string): string {
    return typeStr.length > MAX_TYPE_LENGTH ? typeStr.slice(0, MAX_TYPE_LENGTH) + '...' : typeStr;
}

/** Convert an absolute file path to a repo-relative path. */
export function toRelativePath(filePath: string): string {
    const root = resolveRepoRoot();
    return filePath.startsWith(root) ? filePath.slice(root.length + 1) : filePath;
}

/**
 * Format a member as a readable line with optional decorator prefix and JSDoc description.
 */
export function formatMember(member: MemberInfo): string {
    const lines: string[] = [];
    const decoratorPrefix =
        member.decorators.length > 0 ? member.decorators.map(d => `@${d}`).join(' ') + ' ' : '';
    const inheritedSuffix = member.inheritedFrom
        ? `  (inherited from ${member.inheritedFrom})`
        : '';

    if (member.kind === 'method') {
        const params = (member.parameters ?? [])
            .map(p => `${p.name}: ${truncateType(p.type)}`)
            .join(', ');
        const ret = member.returnType ? truncateType(member.returnType) : 'void';
        lines.push(`- ${decoratorPrefix}${member.name}(${params}): ${ret}${inheritedSuffix}`);
    } else {
        lines.push(
            `- ${decoratorPrefix}${member.name}: ${truncateType(member.type)}${inheritedSuffix}`
        );
    }

    if (member.jsDoc) {
        const indented = collapseJsDoc(member.jsDoc)
            .split('\n')
            .map(l => `    ${l}`)
            .join('\n');
        lines.push(indented);
    }

    return lines.join('\n');
}

/**
 * Format a MemberIndexEntry as a readable line for search results.
 */
export function formatMemberIndexEntry(entry: MemberIndexEntry, index: number): string {
    const lines: string[] = [];
    const staticPrefix = entry.isStatic ? 'static ' : '';
    const typeStr = truncateType(entry.type);
    const ownerSuffix = entry.ownerHint
        ? `${entry.ownerName} \u2014 ${entry.ownerHint}`
        : entry.ownerName;
    lines.push(
        `${index}. [${entry.memberKind}] ${staticPrefix}${entry.name}: ${typeStr} (on ${ownerSuffix})`
    );
    if (entry.jsDoc) {
        const indented = collapseJsDoc(entry.jsDoc)
            .split('\n')
            .map(l => `    ${l}`)
            .join('\n');
        lines.push(indented);
    }
    return lines.join('\n');
}

/** Format combined symbol + member search results as a readable text block. */
export function formatSymbolSearch(
    symbolResults: SymbolEntry[],
    memberResults: MemberIndexEntry[],
    query: string
): string {
    const lines: string[] = [];

    if (symbolResults.length > 0) {
        lines.push(`Symbols (${symbolResults.length} matches):\n`);
        symbolResults.forEach((result, i) => {
            lines.push(
                `${i + 1}. [${result.kind}] ${result.name} (package: ${result.sourcePackage}, file: ${toRelativePath(result.filePath)}, exported: ${result.isExported ? 'yes' : 'no'})`
            );
            if (result.jsDoc) {
                const indented = collapseJsDoc(result.jsDoc)
                    .split('\n')
                    .map(l => `    ${l}`)
                    .join('\n');
                lines.push(indented);
            }
        });
    }

    if (memberResults.length > 0) {
        if (lines.length > 0) lines.push('');
        lines.push(`Members (${memberResults.length} matches):\n`);
        memberResults.forEach((m, i) => {
            lines.push(formatMemberIndexEntry(m, i + 1));
        });
    }

    if (lines.length === 0) {
        return `No symbols or members found matching '${query}'. Try a broader search term.`;
    }

    return lines.join('\n');
}

/** Format detailed symbol information as a readable text block. */
export function formatSymbolDetail(
    detail: SymbolDetail | null,
    name: string,
    companionSymbols?: SymbolEntry[]
): string {
    if (!detail) {
        return `Symbol '${name}' not found. Use search to find available symbols.`;
    }

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
    if (detail.constructorType) {
        lines.push(`Constructor: new ${detail.name}(config: ${detail.constructorType})`);
    }

    lines.push('');
    lines.push('## Signature');
    lines.push(detail.signature);

    if (detail.jsDoc) {
        lines.push('');
        lines.push('## Documentation');
        lines.push(collapseJsDoc(detail.jsDoc));
    }

    // Cross-reference: link Props interfaces to their companion component and vice versa
    if (companionSymbols && companionSymbols.length > 0) {
        lines.push('');
        const companionNames = companionSymbols.map(s => `\`${s.name}\``).join(', ');
        if (detail.kind === 'interface' && detail.name.endsWith('Props')) {
            lines.push(`## Component`);
            lines.push(
                `This is the Props interface for ${companionNames}. ` +
                    `Use hoist-get-members on ${detail.name} to see all available props.`
            );
        } else {
            const propsName = companionSymbols[0].name;
            lines.push(`## Props`);
            lines.push(
                `Accepts \`${propsName}\` — use hoist-get-members on ${propsName} to see all available props.`
            );
        }
    }

    return lines.join('\n');
}

/** Format class/interface members grouped by category. */
export function formatMembers(
    result: {symbol: SymbolDetail; members: MemberInfo[]} | null,
    name: string
): string {
    if (!result) {
        return `Symbol '${name}' not found or is not a class/interface. Use search to find the correct symbol name.`;
    }

    const {members} = result;

    // Separate own members from inherited
    const ownMembers = members.filter(m => !m.inheritedFrom);
    const inheritedMembers = members.filter(m => m.inheritedFrom);

    const lines: string[] = [`# ${name} Members\n`];

    // Format own members by category
    formatMembersByCategory(ownMembers, lines);

    // Format inherited members grouped by declaring class
    if (inheritedMembers.length > 0) {
        const bySource = new Map<string, MemberInfo[]>();
        for (const m of inheritedMembers) {
            const source = m.inheritedFrom!;
            const group = bySource.get(source);
            if (group) group.push(m);
            else bySource.set(source, [m]);
        }

        for (const [source, sourceMembers] of bySource) {
            lines.push(`## Inherited from ${source} (${sourceMembers.length})\n`);
            formatMembersByCategory(sourceMembers, lines);
        }
    }

    if (members.length === 0) {
        lines.push('No members found.');
    }

    return lines.join('\n');
}

/** Format a list of members into categorized sections (properties, methods, static). */
function formatMembersByCategory(members: MemberInfo[], lines: string[]): void {
    const instanceProps = members.filter(
        m => !m.isStatic && (m.kind === 'property' || m.kind === 'accessor')
    );
    const instanceMethods = members.filter(m => !m.isStatic && m.kind === 'method');
    const staticProps = members.filter(
        m => m.isStatic && (m.kind === 'property' || m.kind === 'accessor')
    );
    const staticMethods = members.filter(m => m.isStatic && m.kind === 'method');

    if (instanceProps.length > 0) {
        lines.push(`### Properties (${instanceProps.length})`);
        for (const prop of instanceProps) {
            lines.push(formatMember(prop));
        }
        lines.push('');
    }

    if (instanceMethods.length > 0) {
        lines.push(`### Methods (${instanceMethods.length})`);
        for (const method of instanceMethods) {
            lines.push(formatMember(method));
        }
        lines.push('');
    }

    if (staticProps.length > 0) {
        lines.push(`### Static Properties (${staticProps.length})`);
        for (const prop of staticProps) {
            lines.push(formatMember(prop));
        }
        lines.push('');
    }

    if (staticMethods.length > 0) {
        lines.push(`### Static Methods (${staticMethods.length})`);
        for (const method of staticMethods) {
            lines.push(formatMember(method));
        }
        lines.push('');
    }
}

//------------------------------------------------------------------
// Shared structured-output fragments
//------------------------------------------------------------------

const symbolKindSchema = z.enum(['class', 'interface', 'type', 'function', 'const', 'enum']);

/** Lightweight symbol reference used in search results, companions, and alternates. */
const symbolRefSchema = z.object({
    name: z.string(),
    kind: symbolKindSchema,
    sourcePackage: z.string().describe('Top-level package directory (e.g. "cmp/grid").'),
    filePath: z.string().describe('Repo-relative source file path.'),
    exported: z.boolean()
});

const parameterSchema = z.object({
    name: z.string(),
    type: z.string()
});

/** Full member info as emitted by `hoist-get-members` and member-match results. */
const memberInfoSchema = z.object({
    name: z.string(),
    kind: z.enum(['property', 'method', 'accessor']),
    type: z.string().describe('Property type, or method return type string.'),
    isStatic: z.boolean(),
    isOptional: z.boolean().optional(),
    decorators: z.array(z.string()),
    jsDoc: z.string(),
    parameters: z.array(parameterSchema).optional().describe('Present for methods only.'),
    returnType: z.string().optional().describe('Present for methods only.'),
    inheritedFrom: z
        .string()
        .optional()
        .describe('Declaring class/interface name when inherited from a parent.')
});

function toSymbolRef(
    entry: Pick<SymbolEntry, 'name' | 'kind' | 'sourcePackage' | 'filePath' | 'isExported'>
) {
    return {
        name: entry.name,
        kind: entry.kind,
        sourcePackage: entry.sourcePackage,
        filePath: toRelativePath(entry.filePath),
        exported: entry.isExported
    };
}

function toMemberInfo(m: MemberInfo) {
    return {
        name: m.name,
        kind: m.kind,
        type: m.type,
        isStatic: m.isStatic,
        ...(m.isOptional !== undefined ? {isOptional: m.isOptional} : {}),
        decorators: m.decorators,
        jsDoc: m.jsDoc,
        ...(m.parameters ? {parameters: m.parameters} : {}),
        ...(m.returnType ? {returnType: m.returnType} : {}),
        ...(m.inheritedFrom ? {inheritedFrom: m.inheritedFrom} : {})
    };
}

//------------------------------------------------------------------
// Structured output: hoist-search-symbols
//------------------------------------------------------------------

/**
 * Zod schema for the structured output of `hoist-search-symbols` (and the
 * CLI's `hoist-ts search --json`). Symbol and member hits are returned as
 * separate arrays so JSON consumers can process each without having to
 * discriminate on a union type.
 */
export const searchSymbolsOutputSchema = z.object({
    query: z.string().describe('Echoed back from the request for correlation.'),
    symbolCount: z.number().int(),
    memberCount: z.number().int(),
    symbols: z.array(
        symbolRefSchema.extend({
            jsDoc: z.string(),
            hint: z
                .string()
                .optional()
                .describe('Short hint from the @mcpHint JSDoc tag, if present.')
        })
    ),
    members: z.array(
        z.object({
            name: z.string(),
            memberKind: z.enum(['property', 'method', 'accessor']),
            ownerName: z.string(),
            ownerHint: z.string().optional().describe('Owner @mcpHint text, if present.'),
            sourcePackage: z.string(),
            filePath: z.string().describe('Repo-relative source file path.'),
            isStatic: z.boolean(),
            type: z.string(),
            jsDoc: z.string(),
            decorators: z.array(z.string())
        })
    )
});

export type SearchSymbolsOutput = z.infer<typeof searchSymbolsOutputSchema>;

/** Project internal symbol + member search results into the public structured shape. */
export function toSearchSymbolsOutput(
    query: string,
    symbolResults: SymbolEntry[],
    memberResults: MemberIndexEntry[]
): SearchSymbolsOutput {
    return {
        query,
        symbolCount: symbolResults.length,
        memberCount: memberResults.length,
        symbols: symbolResults.map(s => ({
            ...toSymbolRef(s),
            jsDoc: s.jsDoc,
            ...(s.mcpHint ? {hint: s.mcpHint} : {})
        })),
        members: memberResults.map(m => ({
            name: m.name,
            memberKind: m.memberKind,
            ownerName: m.ownerName,
            ...(m.ownerHint ? {ownerHint: m.ownerHint} : {}),
            sourcePackage: m.sourcePackage,
            filePath: toRelativePath(m.filePath),
            isStatic: m.isStatic,
            type: m.type,
            jsDoc: m.jsDoc,
            decorators: m.decorators
        }))
    };
}

//------------------------------------------------------------------
// Structured output: hoist-get-symbol
//------------------------------------------------------------------

const symbolDetailSchema = z.object({
    name: z.string(),
    kind: symbolKindSchema,
    sourcePackage: z.string(),
    filePath: z.string().describe('Repo-relative source file path.'),
    exported: z.boolean(),
    signature: z.string(),
    jsDoc: z.string(),
    extends: z.string().optional(),
    implements: z.array(z.string()).optional(),
    decorators: z.array(z.string()).optional(),
    constructorType: z
        .string()
        .optional()
        .describe(
            'Name of the config-object interface the constructor accepts, when this class uses the config-object constructor pattern.'
        )
});

/**
 * Zod schema for the structured output of `hoist-get-symbol` (and the CLI's
 * `hoist-ts symbol --json`). `symbol` is null when the name does not resolve;
 * `alternates` lists other symbols with the same name so callers can retry
 * with a disambiguating file path.
 */
export const getSymbolOutputSchema = z.object({
    requestedName: z.string(),
    symbol: z
        .union([symbolDetailSchema, z.null()])
        .describe('The resolved symbol, or null if not found.'),
    companions: z
        .array(symbolRefSchema)
        .describe(
            'Cross-referenced symbols -- e.g. the Props interface for a component, or the component for a Props interface. Empty if none.'
        ),
    alternates: z
        .array(symbolRefSchema)
        .describe(
            'Other exported symbols with the same name (excluding the resolved one). Empty if the name is unique.'
        )
});

export type GetSymbolOutput = z.infer<typeof getSymbolOutputSchema>;

/** Project internal symbol detail + cross-references into the public structured shape. */
export function toGetSymbolOutput(
    requestedName: string,
    detail: SymbolDetail | null,
    companions: SymbolEntry[],
    alternates: SymbolEntry[]
): GetSymbolOutput {
    return {
        requestedName,
        symbol: detail
            ? {
                  name: detail.name,
                  kind: detail.kind,
                  sourcePackage: detail.sourcePackage,
                  filePath: toRelativePath(detail.filePath),
                  exported: detail.isExported,
                  signature: detail.signature,
                  jsDoc: detail.jsDoc,
                  ...(detail.extends ? {extends: detail.extends} : {}),
                  ...(detail.implements && detail.implements.length > 0
                      ? {implements: detail.implements}
                      : {}),
                  ...(detail.decorators && detail.decorators.length > 0
                      ? {decorators: detail.decorators}
                      : {}),
                  ...(detail.constructorType ? {constructorType: detail.constructorType} : {})
              }
            : null,
        companions: companions.map(toSymbolRef),
        alternates: alternates.map(toSymbolRef)
    };
}

//------------------------------------------------------------------
// Structured output: hoist-get-members
//------------------------------------------------------------------

/**
 * Zod schema for the structured output of `hoist-get-members` (and the CLI's
 * `hoist-ts members --json`). Members are returned as a flat array; inherited
 * members are tagged via `inheritedFrom`, and JSON consumers can group by that
 * field if they want the MCP text layout.
 */
export const getMembersOutputSchema = z.object({
    requestedName: z.string(),
    owner: z
        .union([symbolDetailSchema, z.null()])
        .describe(
            'The class or interface whose members are listed, or null if the name did not resolve to a class/interface.'
        ),
    members: z
        .array(memberInfoSchema)
        .describe(
            'All public members including those inherited from parents. Inherited members have `inheritedFrom` set.'
        ),
    alternates: z
        .array(symbolRefSchema)
        .describe('Other exported symbols with the same name. Empty if unique.')
});

export type GetMembersOutput = z.infer<typeof getMembersOutputSchema>;

/** Project internal members result + alternates into the public structured shape. */
export function toGetMembersOutput(
    requestedName: string,
    result: {symbol: SymbolDetail; members: MemberInfo[]} | null,
    alternates: SymbolEntry[]
): GetMembersOutput {
    if (!result) {
        return {requestedName, owner: null, members: [], alternates: alternates.map(toSymbolRef)};
    }
    return {
        requestedName,
        owner: {
            name: result.symbol.name,
            kind: result.symbol.kind,
            sourcePackage: result.symbol.sourcePackage,
            filePath: toRelativePath(result.symbol.filePath),
            exported: result.symbol.isExported,
            signature: result.symbol.signature,
            jsDoc: result.symbol.jsDoc,
            ...(result.symbol.extends ? {extends: result.symbol.extends} : {}),
            ...(result.symbol.implements && result.symbol.implements.length > 0
                ? {implements: result.symbol.implements}
                : {}),
            ...(result.symbol.decorators && result.symbol.decorators.length > 0
                ? {decorators: result.symbol.decorators}
                : {}),
            ...(result.symbol.constructorType
                ? {constructorType: result.symbol.constructorType}
                : {})
        },
        members: result.members.map(toMemberInfo),
        alternates: alternates.map(toSymbolRef)
    };
}
