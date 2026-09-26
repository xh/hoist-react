/**
 * Shared formatting and projection functions for TypeScript symbol and member results.
 *
 * Used by both the MCP tools (`tools/typescript.ts`) and the CLI (`cli/ts.ts`) to produce
 * identical output from the same data. Offers two projections of each result set:
 * - Text -- human-readable block for CLI stdout and MCP text content.
 * - Structured -- typed JSON shape for MCP `structuredContent` and CLI `--json` output. Shape
 *   is validated by the exported zod schemas.
 *
 * The only surface-specific text is the trailing "what to call next" hint, since the MCP tool
 * and the CLI command take their arguments differently. See {@link Surface}. Callers append it
 * after a blank line, and the parity spec strips it before comparing.
 */
import {z} from 'zod';

import {
    findAlternateEntries,
    getCompanionSymbols,
    getMembers,
    getSymbolDeclarations,
    type ExternalMemberGroup,
    type MemberFilter,
    type MemberInfo,
    type SymbolDetail,
    type SymbolEntry,
    type SymbolKind
} from '../data/ts-registry.js';
import {MEMBER_SUMMARY_CHARS, type SymbolSearchResults} from '../data/symbol-search.js';
import {firstSentence} from '../data/search-text.js';
import {resolveRepoRootPosix, toPosixPath} from '../util/paths.js';

/** Which interface is rendering output - selects the syntax of next-step hints. */
export type Surface = 'mcp' | 'cli';

/** Search output shape: one line per hit, or the full JSDoc of every hit. */
export type SearchDetail = 'concise' | 'full';

/** Member lines shown in the `hoist-get-symbol` summary before it defers to `hoist-get-members`. */
export const MAX_SUMMARY_MEMBERS = 60;

/** Members listed per external group before the rest are counted rather than shown. */
export const MAX_EXTERNAL_LISTED = 40;

/**
 * Member listings up to this size show full JSDoc; larger ones show one line per member with
 * the first JSDoc sentence, unless `detail` is passed. Keeps a broad filter on a large class
 * (`GridModel` with `filter: "col"` matches ~40 members) readable at a glance.
 */
export const FULL_DETAIL_MAX_MEMBERS = 20;

/** Member listing shape: full JSDoc per member, or one line with the first sentence. */
export type MemberDetail = 'full' | 'summary';

/** Longest type text in one-line member summaries. */
const SUMMARY_TYPE_LENGTH = 80;

/** Maximum length for type strings before truncation. */
const MAX_TYPE_LENGTH = 200;

//------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------

/** Remove blank lines from a JSDoc string to produce more compact output. */
function collapseJsDoc(jsDoc: string): string {
    return jsDoc
        .split('\n')
        .filter(l => l.trim().length > 0)
        .join('\n');
}

/** Indent every line of a JSDoc block for display beneath a member or symbol line. */
function indentJsDoc(jsDoc: string, indent = '    '): string {
    return collapseJsDoc(jsDoc)
        .split('\n')
        .map(l => `${indent}${l}`)
        .join('\n');
}

/** Truncate a type string if it exceeds `max` characters. */
export function truncateType(typeStr: string, max = MAX_TYPE_LENGTH): string {
    return typeStr.length > max ? typeStr.slice(0, max) + '...' : typeStr;
}

/** Convert an absolute file path to a repo-relative path. */
export function toRelativePath(filePath: string): string {
    // Symbol filePaths originate from ts-morph (forward slashes on all platforms);
    // compare in POSIX form so the repo-root prefix strips correctly on Windows,
    // where `resolveRepoRoot()` would otherwise yield a backslash path.
    const root = resolveRepoRootPosix();
    const posix = toPosixPath(filePath);
    return posix.startsWith(root) ? posix.slice(root.length + 1) : posix;
}

/** `import {Name} from '@xh/hoist/pkg';`, or an explanation of why there is no public import. */
function importLine(
    detail: Pick<SymbolDetail, 'name' | 'importPath' | 'sourcePackage' | 'kind'>
): string {
    if (detail.importPath) return `import {${detail.name}} from '${detail.importPath}';`;
    if (detail.sourcePackage === 'promise' && detail.kind === 'function') {
        return 'none needed - Promise prototype extension, available on every Promise';
    }
    return 'none - not re-exported from a package barrel (internal API)';
}

/** Name plus `?` for optional members and `static ` for statics. */
function memberLabel(m: Pick<MemberInfo, 'name' | 'isStatic' | 'isOptional'>): string {
    return `${m.isStatic ? 'static ' : ''}${m.name}${m.isOptional ? '?' : ''}`;
}

/** `name: type` or `name(params): ret`, one line, with the default when known. */
function memberSignature(m: MemberInfo, typeLength = MAX_TYPE_LENGTH): string {
    let sig: string;
    if (m.kind === 'method') {
        const params = (m.parameters ?? [])
            .map(p => `${p.name}: ${truncateType(p.type, typeLength)}`)
            .join(', ');
        sig = `${memberLabel(m)}(${params}): ${truncateType(m.returnType ?? 'void', typeLength)}`;
    } else {
        sig = `${memberLabel(m)}: ${truncateType(m.type, typeLength)}`;
    }
    return m.default != null ? `${sig} = ${m.default}` : sig;
}

/** Disambiguation note listing other symbols that share the name, selectable by file path. */
function alternatesNote(name: string, alternates: SymbolEntry[]): string {
    if (alternates.length === 0) return '';
    const list = alternates
        .map(a => `  - [${a.kind}] ${a.sourcePackage} (${toRelativePath(a.filePath)})`)
        .join('\n');
    return `Note: ${alternates.length + 1} symbols named "${name}" exist. Others, selectable by file path:\n${list}`;
}

/** How to select an alternate by file path, in the calling surface's syntax. */
function filePathHint(surface: Surface, alternates: SymbolEntry[]): string {
    if (alternates.length === 0) return '';
    const example = toRelativePath(alternates[0].filePath);
    return surface === 'mcp'
        ? ` Select an alternate with filePath: "${example}".`
        : ` Select an alternate with --file ${example}.`;
}

//------------------------------------------------------------------
// Shared structured-output fragments
//------------------------------------------------------------------

const symbolKindSchema = z.enum(['class', 'interface', 'type', 'function', 'const', 'enum']);

const importPathSchema = z
    .union([z.string(), z.null()])
    .describe(
        'Public import path (e.g. "@xh/hoist/cmp/grid"), or null when no package barrel re-exports the symbol.'
    );

/** Lightweight symbol reference used in search results, companions, and alternates. */
const symbolRefSchema = z.object({
    name: z.string(),
    kind: symbolKindSchema,
    importPath: importPathSchema,
    sourcePackage: z.string().describe('Source package directory (e.g. "cmp/grid").'),
    filePath: z.string().describe('Repo-relative source file path.'),
    exported: z.boolean()
});

const parameterSchema = z.object({
    name: z.string(),
    type: z.string(),
    description: z
        .string()
        .optional()
        .describe('Description from a matching `@param` JSDoc tag, when present.')
});

/** Full member info as emitted by `hoist-get-members`. */
const memberInfoSchema = z.object({
    name: z.string(),
    kind: z.enum(['property', 'method', 'accessor']),
    type: z.string().describe('Property type, or method return type string.'),
    isStatic: z.boolean(),
    isOptional: z.boolean().optional(),
    decorators: z.array(z.string()),
    jsDoc: z.string(),
    default: z
        .string()
        .optional()
        .describe(
            'Property initializer text (`true`, `[]`), when the declaration has a short one.'
        ),
    parameters: z.array(parameterSchema).optional().describe('Present for methods only.'),
    returnType: z.string().optional().describe('Present for methods only.'),
    returns: z
        .object({type: z.string(), description: z.string()})
        .optional()
        .describe(
            'Return-value info from a `@returns` JSDoc tag, when present. `type` mirrors `returnType`; `description` carries the author prose.'
        ),
    inheritedFrom: z
        .string()
        .optional()
        .describe(
            'Parent class or interface name when this member is inherited via `extends` - both the member and its behavior come from the named ancestor.'
        ),
    jsDocInheritedFrom: z
        .string()
        .optional()
        .describe(
            "Interface name when this member's JSDoc came from an implemented interface or a sibling *Spec/*Config interface, because the declaring class documents nothing on it. Orthogonal to `inheritedFrom`."
        )
});

const symbolDetailSchema = z.object({
    name: z.string(),
    kind: symbolKindSchema,
    importPath: importPathSchema,
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

function toSymbolRef(
    entry: Pick<
        SymbolEntry,
        'name' | 'kind' | 'importPath' | 'sourcePackage' | 'filePath' | 'isExported'
    >
) {
    return {
        name: entry.name,
        kind: entry.kind,
        importPath: entry.importPath,
        sourcePackage: entry.sourcePackage,
        filePath: toRelativePath(entry.filePath),
        exported: entry.isExported
    };
}

function toSymbolDetail(detail: SymbolDetail) {
    return {
        name: detail.name,
        kind: detail.kind,
        importPath: detail.importPath,
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
        ...(m.default != null ? {default: m.default} : {}),
        ...(m.parameters
            ? {
                  parameters: m.parameters.map(p => ({
                      name: p.name,
                      type: p.type,
                      ...(p.description ? {description: p.description} : {})
                  }))
              }
            : {}),
        ...(m.returnType ? {returnType: m.returnType} : {}),
        ...(m.returns ? {returns: m.returns} : {}),
        ...(m.inheritedFrom ? {inheritedFrom: m.inheritedFrom} : {}),
        ...(m.jsDocInheritedFrom ? {jsDocInheritedFrom: m.jsDocInheritedFrom} : {})
    };
}

//------------------------------------------------------------------
// Search: hoist-search-symbols
//------------------------------------------------------------------

/** Format ranked symbol and member hits - one line each, or with full JSDoc for `detail: 'full'`. */
export function formatSymbolSearch(results: SymbolSearchResults, detail: SearchDetail): string {
    const {query, symbols, members} = results;
    if (symbols.length === 0 && members.length === 0) {
        return `No symbols or members matched "${query}". Try one strong keyword - an API name like "GridModel" or "persistWith" (camelCase names match their parts).`;
    }

    const lines: string[] = [];
    if (symbols.length > 0) {
        lines.push(`Symbols (${symbols.length} of ${results.symbolTotal} matched "${query}"):`);
        symbols.forEach((hit, i) => {
            const e = hit.entry,
                kind = hit.factory || hit.props ? 'component' : e.kind,
                name = hit.factory ? `${e.name} / ${hit.factory}` : e.name,
                where = e.importPath ?? `no public import - ${toRelativePath(e.filePath)}`,
                props = hit.props ? ` Props: ${hit.props}.` : '',
                hint = e.mcpHint ? ` [${e.mcpHint}]` : '';
            if (detail === 'full') {
                lines.push(
                    `${i + 1}. [${kind}] ${name} (${where}; file: ${toRelativePath(e.filePath)}; exported: ${e.isExported ? 'yes' : 'no'})${props}${hint}`
                );
                if (e.jsDoc) lines.push(indentJsDoc(e.jsDoc));
            } else {
                const summary = hit.summary ? ` - ${hit.summary}` : '';
                lines.push(`${i + 1}. [${kind}] ${name} (${where})${summary}${props}${hint}`);
            }
        });
    }

    if (members.length > 0) {
        if (lines.length > 0) lines.push('');
        lines.push(`Members (${members.length} of ${results.memberTotal}):`);
        const hintedOwners = new Set<string>();
        members.forEach((hit, i) => {
            const m = hit.entry,
                label = `${m.isStatic ? 'static ' : ''}${m.ownerName}.${m.name}`,
                dflt = m.default != null ? ` = ${m.default}` : '',
                // An owner's hint reads once per result set, on its first member hit.
                ownerHint =
                    m.ownerHint && !hintedOwners.has(m.ownerName)
                        ? ` [${m.ownerName}: ${m.ownerHint}]`
                        : '';
            hintedOwners.add(m.ownerName);
            if (detail === 'full') {
                lines.push(
                    `${i + 1}. [${m.memberKind}] ${label}: ${truncateType(m.type)}${dflt} (${hit.importPath ?? `no public import - ${toRelativePath(m.filePath)}`})${ownerHint}`
                );
                if (m.jsDoc) lines.push(indentJsDoc(m.jsDoc));
            } else {
                const summary = hit.summary ? ` - ${hit.summary}` : '';
                lines.push(
                    `${i + 1}. ${label}: ${truncateType(m.type, SUMMARY_TYPE_LENGTH)}${dflt}${summary}${ownerHint}`
                );
            }
        });
    }
    return lines.join('\n');
}

/** Next-step hint for a search, in the calling surface's syntax. */
export function searchNextHint(surface: Surface, hasResults: boolean): string {
    if (!hasResults) {
        return surface === 'mcp'
            ? 'Pass includeInternal: true to search impl code, or use hoist-search-docs for concepts and how-tos.'
            : 'Add --include-internal to search impl code, or use "hoist-docs search" for concepts and how-tos.';
    }
    return surface === 'mcp'
        ? 'Next: hoist-get-symbol {name} for signature, docs, import, and a member summary; hoist-get-members {name, filter} for member docs.'
        : 'Next: "hoist-ts symbol <Name>" for signature, docs, import, and a member summary; "hoist-ts members <Name> --filter <text>" for member docs.';
}

/**
 * Zod schema for the structured output of `hoist-search-symbols` (and the CLI's
 * `hoist-ts search --json`). Symbol and member hits are returned as separate arrays. `jsDoc`
 * is present only for `detail: "full"`; `summary` is always present.
 */
export const searchSymbolsOutputSchema = z.object({
    query: z.string().describe('Echoed back from the request for correlation.'),
    detail: z.enum(['concise', 'full']),
    symbolCount: z.number().int().describe('Symbol results returned.'),
    symbolTotal: z.number().int().describe('Symbols that matched before the limit was applied.'),
    memberCount: z.number().int(),
    memberTotal: z.number().int(),
    symbols: z.array(
        symbolRefSchema.extend({
            summary: z.string().describe('First JSDoc sentence, cut at about 100 characters.'),
            hasMembers: z
                .boolean()
                .describe('True for classes and interfaces - pass the name to hoist-get-members.'),
            factory: z
                .string()
                .optional()
                .describe(
                    'Element factory exported beside this component (`button` for `Button`).'
                ),
            props: z
                .string()
                .optional()
                .describe(
                    'Props interface of this component (`ButtonProps`), folded into its hit. Pass to hoist-get-members for the props.'
                ),
            hint: z
                .string()
                .optional()
                .describe('Short hint from the @mcpHint JSDoc tag, if present.'),
            jsDoc: z.string().optional().describe('Full JSDoc. Present for detail "full" only.')
        })
    ),
    members: z.array(
        z.object({
            name: z.string(),
            memberKind: z.enum(['property', 'method', 'accessor']),
            ownerName: z.string(),
            ownerHint: z.string().optional().describe('Owner @mcpHint text, if present.'),
            importPath: importPathSchema.describe('Public import path of the owner, or null.'),
            sourcePackage: z.string(),
            filePath: z.string().describe('Repo-relative source file path.'),
            isStatic: z.boolean(),
            type: z.string(),
            default: z.string().optional().describe('Property initializer text, when short.'),
            summary: z.string().describe('First JSDoc sentence, cut at about 100 characters.'),
            jsDoc: z.string().optional().describe('Full JSDoc. Present for detail "full" only.'),
            decorators: z.array(z.string())
        })
    )
});

export type SearchSymbolsOutput = z.infer<typeof searchSymbolsOutputSchema>;

/** Project ranked search results into the public structured shape. */
export function toSearchSymbolsOutput(
    results: SymbolSearchResults,
    detail: SearchDetail
): SearchSymbolsOutput {
    return {
        query: results.query,
        detail,
        symbolCount: results.symbols.length,
        symbolTotal: results.symbolTotal,
        memberCount: results.members.length,
        memberTotal: results.memberTotal,
        symbols: results.symbols.map(hit => ({
            ...toSymbolRef(hit.entry),
            summary: hit.summary,
            hasMembers: hit.hasMembers,
            ...(hit.factory ? {factory: hit.factory} : {}),
            ...(hit.props ? {props: hit.props} : {}),
            ...(hit.entry.mcpHint ? {hint: hit.entry.mcpHint} : {}),
            ...(detail === 'full' ? {jsDoc: hit.entry.jsDoc} : {})
        })),
        members: results.members.map(hit => {
            const m = hit.entry;
            return {
                name: m.name,
                memberKind: m.memberKind,
                ownerName: m.ownerName,
                ...(m.ownerHint ? {ownerHint: m.ownerHint} : {}),
                importPath: hit.importPath,
                sourcePackage: m.sourcePackage,
                filePath: toRelativePath(m.filePath),
                isStatic: m.isStatic,
                type: m.type,
                ...(m.default != null ? {default: m.default} : {}),
                summary: hit.summary,
                ...(detail === 'full' ? {jsDoc: m.jsDoc} : {}),
                decorators: m.decorators
            };
        })
    };
}

//------------------------------------------------------------------
// Symbol: hoist-get-symbol
//------------------------------------------------------------------

/** Arguments shared by `hoist-get-symbol` and `hoist-ts symbol`. */
export interface GetSymbolArgs {
    name: string;
    filePath?: string;
    kind?: SymbolKind;
}

const memberSummarySchema = z.object({
    total: z.number().int().describe('Own plus inherited members.'),
    shown: z.number().int().describe(`Entries in \`list\`, at most ${MAX_SUMMARY_MEMBERS}.`),
    list: z.array(
        z.object({
            name: z.string(),
            kind: z.enum(['property', 'method', 'accessor']),
            signature: z
                .string()
                .describe(
                    '`name: type` or `name(params): returnType`, with `= default` when known.'
                ),
            isStatic: z.boolean(),
            inheritedFrom: z.string().optional()
        })
    )
});

/**
 * Zod schema for the structured output of `hoist-get-symbol` and the CLI's
 * `hoist-ts symbol --json`. A name shared by two declarations in one file (`FieldType` as
 * `const` and `type`) returns the primary in `symbol` and the rest in `otherDeclarations`,
 * each complete.
 */
export const getSymbolOutputSchema = z.object({
    requestedName: z.string(),
    symbol: symbolDetailSchema,
    otherDeclarations: z
        .array(symbolDetailSchema)
        .describe(
            'Other declarations of this name in the same file, e.g. the `type` beside a `const`.'
        ),
    members: memberSummarySchema
        .optional()
        .describe(
            'Compact member summary, present for classes and interfaces. Own members first, then inherited.'
        ),
    companions: z
        .array(symbolRefSchema)
        .describe(
            'Cross-referenced symbols -- e.g. the Props interface for a component, or the component for a Props interface. Empty if none.'
        ),
    alternates: z
        .array(symbolRefSchema)
        .describe(
            'Other exported symbols with the same name in other files (excluding the resolved one). Empty if the name is unique.'
        )
});

export type GetSymbolOutput = z.infer<typeof getSymbolOutputSchema>;

/** Outcome of a symbol lookup, ready for either surface to emit. `hint` is surface-specific. */
export type GetSymbolResponse =
    {ok: true; text: string; hint: string; structured: GetSymbolOutput} | {ok: false; text: string};

/**
 * Resolve and describe a symbol: import line, signature, JSDoc, companions, and for classes
 * and interfaces a compact member summary. The single implementation behind `hoist-get-symbol`
 * and `hoist-ts symbol`, so both surfaces return identical content.
 */
export async function describeSymbol(
    args: GetSymbolArgs,
    surface: Surface
): Promise<GetSymbolResponse> {
    const {name} = args,
        declarations = await getSymbolDeclarations(name, {
            filePath: args.filePath,
            kind: args.kind
        });
    if (declarations.length === 0) {
        const how =
            surface === 'mcp'
                ? 'Use hoist-search-symbols to find the exact name.'
                : 'Use "hoist-ts search <query>" to find the exact name.';
        return {ok: false, text: `Symbol "${name}" not found. ${how}`};
    }

    const [primary, ...others] = declarations,
        companions = await getCompanionSymbols(primary),
        alternates = args.filePath ? [] : findAlternateEntries(name, primary.filePath),
        withMembers = primary.kind === 'class' || primary.kind === 'interface',
        membersResult = withMembers ? await getMembers(name, {filePath: primary.filePath}) : null,
        members = membersResult?.ok ? membersResult.members : null;

    const lines: string[] = [];
    if (others.length > 0) {
        lines.push(
            `${declarations.length} declarations of "${name}" in ${toRelativePath(primary.filePath)}: ${declarations.map(d => d.kind).join(' and ')}.`,
            ''
        );
    }
    lines.push(formatSymbolBlock(primary, companions));
    for (const other of others) lines.push('', '---', '', formatSymbolBlock(other, []));
    if (members) lines.push('', formatMemberSummary(members));
    if (alternates.length > 0) lines.push('', alternatesNote(name, alternates));

    return {
        ok: true,
        text: lines.join('\n'),
        hint: (
            symbolNextHint(surface, primary, companions) + filePathHint(surface, alternates)
        ).trim(),
        structured: {
            requestedName: name,
            symbol: toSymbolDetail(primary),
            otherDeclarations: others.map(toSymbolDetail),
            ...(members
                ? {
                      members: {
                          total: members.length,
                          shown: Math.min(members.length, MAX_SUMMARY_MEMBERS),
                          list: members.slice(0, MAX_SUMMARY_MEMBERS).map(m => ({
                              name: m.name,
                              kind: m.kind,
                              signature: memberSignature(m, SUMMARY_TYPE_LENGTH),
                              isStatic: m.isStatic,
                              ...(m.inheritedFrom ? {inheritedFrom: m.inheritedFrom} : {})
                          }))
                      }
                  }
                : {}),
            companions: companions.map(toSymbolRef),
            alternates: alternates.map(toSymbolRef)
        }
    };
}

/** Header, signature, documentation, and companion cross-reference for one declaration. */
function formatSymbolBlock(detail: SymbolDetail, companions: SymbolEntry[]): string {
    const lines: string[] = [
        `# ${detail.name} (${detail.kind})`,
        `Import: ${importLine(detail)}`,
        `Package: ${detail.sourcePackage}`,
        `File: ${toRelativePath(detail.filePath)}`,
        `Exported: ${detail.isExported ? 'yes' : 'no'}`
    ];
    if (detail.extends) lines.push(`Extends: ${detail.extends}`);
    if (detail.implements?.length) lines.push(`Implements: ${detail.implements.join(', ')}`);
    if (detail.decorators?.length) {
        lines.push(`Decorators: ${detail.decorators.map(d => `@${d}`).join(', ')}`);
    }
    if (detail.constructorType) {
        lines.push(`Constructor: new ${detail.name}(config: ${detail.constructorType})`);
    }

    lines.push('', '## Signature', detail.signature);
    if (detail.jsDoc) lines.push('', '## Documentation', collapseJsDoc(detail.jsDoc));

    // Cross-reference: link Props interfaces to their companion component and vice versa
    if (companions.length > 0) {
        const names = companions.map(s => `\`${s.name}\``).join(', ');
        lines.push('');
        if (detail.kind === 'interface' && detail.name.endsWith('Props')) {
            lines.push('## Component', `Props interface for ${names}.`);
        } else {
            lines.push('## Props', `Accepts \`${companions[0].name}\`.`);
        }
    }
    return lines.join('\n');
}

/** Compact `name: type` member list: own members first, inherited grouped by declaring type. */
function formatMemberSummary(members: MemberInfo[]): string {
    const own = members.filter(m => !m.inheritedFrom),
        inherited = members.filter(m => m.inheritedFrom),
        shown = members.slice(0, MAX_SUMMARY_MEMBERS),
        lines = [`## Members (${own.length} own, ${inherited.length} inherited)`];

    let lastSource: string | undefined;
    for (const m of shown) {
        if (m.inheritedFrom && m.inheritedFrom !== lastSource) {
            lines.push(`### Inherited from ${m.inheritedFrom}`);
            lastSource = m.inheritedFrom;
        }
        lines.push(`- ${memberSignature(m, SUMMARY_TYPE_LENGTH)}`);
    }
    if (members.length > shown.length) {
        lines.push(`(${members.length - shown.length} more members not shown)`);
    }
    if (members.length === 0) lines.push('No members found.');
    return lines.join('\n');
}

/** Next-step hint after a symbol lookup, in the calling surface's syntax. */
export function symbolNextHint(
    surface: Surface,
    detail: Pick<SymbolDetail, 'name' | 'kind'>,
    companions: Pick<SymbolEntry, 'name' | 'kind'>[]
): string {
    const target =
        detail.kind === 'class' || detail.kind === 'interface'
            ? detail.name
            : companions.find(c => c.kind === 'interface')?.name;
    if (!target) return '';
    const what = target === detail.name ? 'Full member details' : `Its props (\`${target}\`)`;
    return surface === 'mcp'
        ? `${what}: hoist-get-members {name: "${target}"}; narrow with filter: "<text>", include: "own" | "inherited", or memberKind.`
        : `${what}: hoist-ts members ${target} [--filter <text>] [--include own|inherited] [--kind property|method|accessor]`;
}

//------------------------------------------------------------------
// Members: hoist-get-members
//------------------------------------------------------------------

/** Arguments shared by `hoist-get-members` and `hoist-ts members`. */
export interface GetMembersArgs extends MemberFilter {
    name: string;
    filePath?: string;
    /** Listing shape. Default: full for up to {@link FULL_DETAIL_MAX_MEMBERS} members, else summary. */
    detail?: MemberDetail;
}

const externalGroupSchema = z.object({
    declaredIn: z
        .string()
        .describe('Interface or class outside hoist-react that declares these members.'),
    module: z
        .union([z.string(), z.null()])
        .describe(
            'npm package of the declaring type (e.g. "@blueprintjs/core"), or null for a hoist-react type reached through a type operator.'
        ),
    total: z.number().int().describe('Members in this group after filtering.'),
    members: z
        .array(
            z.object({
                name: z.string(),
                kind: z.enum(['property', 'method']),
                type: z.string().optional().describe('Declared type text, when short.')
            })
        )
        .describe(
            `Listed members. Standard React attribute groups (@types/react) are listed only when a filter is passed; other groups list up to ${MAX_EXTERNAL_LISTED}.`
        )
});

/**
 * Zod schema for the structured output of `hoist-get-members` and the CLI's
 * `hoist-ts members --json`. Members are a flat array; inherited members carry `inheritedFrom`.
 * Members inherited from types outside hoist-react (React, Blueprint) are grouped in
 * `externalMembers`.
 */
export const getMembersOutputSchema = z.object({
    requestedName: z.string(),
    owner: symbolDetailSchema.describe('The class or interface whose members are listed.'),
    filter: z
        .object({
            filter: z.string().optional(),
            include: z.enum(['own', 'inherited', 'all']),
            memberKind: z.enum(['property', 'method', 'accessor']).optional()
        })
        .describe('The filters applied to this listing.'),
    detail: z
        .enum(['full', 'summary'])
        .describe(
            `Listing shape used: full JSDoc per member, or (for listings over ${FULL_DETAIL_MAX_MEMBERS} members unless overridden) one line per member with the first sentence.`
        ),
    totalMembers: z.number().int().describe('Own plus inherited members before filtering.'),
    members: z
        .array(memberInfoSchema)
        .describe('Members after filtering. Inherited members have `inheritedFrom` set.'),
    totalExternal: z.number().int().describe('Externally inherited members before filtering.'),
    externalMembers: z.array(externalGroupSchema),
    alternates: z
        .array(symbolRefSchema)
        .describe('Other exported symbols with the same name. Empty if unique.')
});

export type GetMembersOutput = z.infer<typeof getMembersOutputSchema>;

export type GetMembersResponse =
    | {ok: true; text: string; hint: string; structured: GetMembersOutput}
    | {ok: false; text: string};

/**
 * List the members of a class or interface with filters, inherited members grouped by declaring
 * type, and externally inherited members grouped by their declaring type. The single
 * implementation behind `hoist-get-members` and `hoist-ts members`.
 */
export async function describeMembers(
    args: GetMembersArgs,
    surface: Surface
): Promise<GetMembersResponse> {
    const {name} = args,
        filter: MemberFilter = {
            filter: args.filter || undefined,
            include: args.include ?? 'all',
            memberKind: args.memberKind
        },
        result = await getMembers(name, {filePath: args.filePath, ...filter});

    if (!result.ok) {
        if (result.reason === 'not-found') {
            const how =
                surface === 'mcp'
                    ? 'Use hoist-search-symbols to find the exact name.'
                    : 'Use "hoist-ts search <query>" to find the exact name.';
            return {ok: false, text: `Symbol "${name}" not found. ${how}`};
        }
        const kinds = result.entries.map(e => e.kind).join(' and '),
            file = toRelativePath(result.entries[0].filePath),
            how =
                surface === 'mcp'
                    ? `Use hoist-get-symbol {name: "${name}"} to see its declaration.`
                    : `Use "hoist-ts symbol ${name}" to see its declaration.`;
        return {
            ok: false,
            text: `"${name}" is a ${kinds} (${file}), not a class or interface, so it has no members to list. ${how}`
        };
    }

    const {symbol, members, externalMembers} = result,
        alternates = args.filePath ? [] : findAlternateEntries(name, symbol.filePath),
        detail: MemberDetail =
            args.detail ?? (members.length > FULL_DETAIL_MAX_MEMBERS ? 'summary' : 'full'),
        filtering = filter.filter || filter.include !== 'all' || filter.memberKind,
        describeFilter = [
            filter.filter ? `matching "${filter.filter}"` : '',
            filter.include !== 'all' ? `${filter.include} only` : '',
            filter.memberKind
                ? `${filter.memberKind === 'property' ? 'properties' : filter.memberKind + 's'} only`
                : ''
        ]
            .filter(Boolean)
            .join(', ');

    const externalCount = externalMembers.reduce((n, g) => n + g.members.length, 0),
        header = filtering
            ? `# ${symbol.name} Members ${describeFilter} (${members.length} of ${result.totalMembers}${result.totalExternal ? `, ${externalCount} of ${result.totalExternal} external` : ''})`
            : `# ${symbol.name} Members (${members.length}${result.totalExternal ? `, plus ${result.totalExternal} external` : ''})`,
        lines = [header, `Import: ${importLine(symbol)}`];
    if (detail === 'summary' && members.length > 0) {
        lines.push('(one line per member; narrow the filter for full docs)');
    }
    lines.push('');

    const own = members.filter(m => !m.inheritedFrom),
        inherited = members.filter(m => m.inheritedFrom);
    formatMembersByCategory(own, lines, detail);

    const bySource = new Map<string, MemberInfo[]>();
    for (const m of inherited) {
        const group = bySource.get(m.inheritedFrom!);
        if (group) group.push(m);
        else bySource.set(m.inheritedFrom!, [m]);
    }
    for (const [source, sourceMembers] of bySource) {
        lines.push(`## Inherited from ${source} (${sourceMembers.length})`, '');
        formatMembersByCategory(sourceMembers, lines, detail);
    }

    if (members.length === 0) lines.push(filtering ? 'No members match.' : 'No members found.', '');

    const listed = projectExternalGroups(externalMembers, !!filter.filter);
    if (externalMembers.length > 0) {
        lines.push('## Inherited from types outside hoist-react', '');
        for (const g of listed) {
            const from = g.module ? `${g.declaredIn} (${g.module})` : g.declaredIn;
            if (g.members.length === 0) {
                lines.push(`### ${from} - ${g.total} standard React attributes, not listed`);
            } else {
                lines.push(`### ${from} (${g.total})`);
                for (const m of g.members) {
                    lines.push(`- ${m.name}${m.type ? `: ${m.type}` : ''}`);
                }
                if (g.members.length < g.total) {
                    lines.push(`(${g.total - g.members.length} more not listed)`);
                }
            }
            lines.push('');
        }
    }

    if (alternates.length > 0) lines.push(alternatesNote(name, alternates), '');

    return {
        ok: true,
        text: lines.join('\n').trimEnd(),
        hint: membersNextHint(surface, symbol.name) + filePathHint(surface, alternates),
        structured: {
            requestedName: name,
            owner: toSymbolDetail(symbol),
            filter: {
                ...(filter.filter ? {filter: filter.filter} : {}),
                include: filter.include ?? 'all',
                ...(filter.memberKind ? {memberKind: filter.memberKind} : {})
            },
            detail,
            totalMembers: result.totalMembers,
            members: members.map(toMemberInfo),
            totalExternal: result.totalExternal,
            externalMembers: listed,
            alternates: alternates.map(toSymbolRef)
        }
    };
}

/**
 * External groups as listed: React's generic attribute interfaces (`HTMLAttributes`,
 * `AriaAttributes`, `DOMAttributes`, ...) are counted but not listed unless a name filter is
 * active, and other groups list up to {@link MAX_EXTERNAL_LISTED} members.
 */
function projectExternalGroups(groups: ExternalMemberGroup[], filtered: boolean) {
    return groups.map(g => {
        const generic = g.module === '@types/react' && !filtered;
        return {
            declaredIn: g.declaredIn,
            module: g.module,
            total: g.members.length,
            members: generic ? [] : g.members.slice(0, MAX_EXTERNAL_LISTED)
        };
    });
}

/** Next-step hint after a member listing, in the calling surface's syntax. */
export function membersNextHint(surface: Surface, name: string): string {
    return surface === 'mcp'
        ? `Narrow ${name} with filter (substring), include: "own" | "inherited", or memberKind; detail: "full" forces docs on a long list. A filter also searches external groups marked "not listed".`
        : `Narrow ${name} with --filter <substring>, --include own|inherited, or --kind; --detail full forces docs on a long list. A filter also searches external groups marked "not listed".`;
}

/**
 * Format a member as a readable line with optional decorator prefix and JSDoc description.
 *
 * For methods, surfaces `@param` descriptions inline beneath each parameter and `@returns`
 * description on a Returns line - both populated from JSDoc tags by the registry layer.
 */
export function formatMember(member: MemberInfo, detail: MemberDetail = 'full'): string {
    const lines: string[] = [],
        decoratorPrefix =
            member.decorators.length > 0 ? member.decorators.map(d => `@${d}`).join(' ') + ' ' : '',
        // Annotate extends-chain inheritance only - knowing the member came from a parent is
        // useful context. Docs-only inheritance (`jsDocInheritedFrom`) is provenance metadata
        // that does not change how the API is used, so the text shows the inherited JSDoc inline.
        inheritedSuffix = member.inheritedFrom ? `  (inherited from ${member.inheritedFrom})` : '';

    if (detail === 'summary') {
        const summary = firstSentence(member.jsDoc, MEMBER_SUMMARY_CHARS);
        return `- ${decoratorPrefix}${memberSignature(member, SUMMARY_TYPE_LENGTH)}${summary ? ` - ${summary}` : ''}${inheritedSuffix}`;
    }

    lines.push(`- ${decoratorPrefix}${memberSignature(member)}${inheritedSuffix}`);
    if (member.jsDoc) lines.push(indentJsDoc(member.jsDoc));

    // Per-parameter descriptions from `@param` tags
    const describedParams = (member.parameters ?? []).filter(p => p.description);
    if (describedParams.length > 0) {
        lines.push('    Parameters:');
        for (const p of describedParams) {
            lines.push(`      ${p.name}: ${p.description!.split('\n').join('\n        ')}`);
        }
    }

    // Return-value description from `@returns` tag
    if (member.returns?.description) {
        lines.push(`    Returns: ${member.returns.description.split('\n').join('\n      ')}`);
    }
    return lines.join('\n');
}

/** Format a list of members into categorized sections (properties, methods, static). */
function formatMembersByCategory(
    members: MemberInfo[],
    lines: string[],
    detail: MemberDetail
): void {
    const groups: Array<[string, MemberInfo[]]> = [
        ['Properties', members.filter(m => !m.isStatic && m.kind !== 'method')],
        ['Methods', members.filter(m => !m.isStatic && m.kind === 'method')],
        ['Static Properties', members.filter(m => m.isStatic && m.kind !== 'method')],
        ['Static Methods', members.filter(m => m.isStatic && m.kind === 'method')]
    ];
    for (const [title, group] of groups) {
        if (group.length === 0) continue;
        lines.push(`### ${title} (${group.length})`);
        for (const m of group) lines.push(formatMember(m, detail));
        lines.push('');
    }
}
