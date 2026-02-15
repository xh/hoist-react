/**
 * Shared prompt utilities for the Hoist MCP server.
 *
 * Provides helpers for loading documentation content, extracting markdown
 * sections, formatting type information, and emitting common Hoist convention
 * blocks. These utilities are consumed by all developer prompt implementations
 * to compose structured, context-rich prompt responses.
 */
import {buildRegistry, loadDocContent, type DocEntry} from '../data/doc-registry.js';
import {ensureInitialized, getSymbolDetail, getMembers} from '../data/ts-registry.js';
import {resolveRepoRoot} from '../util/paths.js';

//------------------------------------------------------------------
// Doc registry (lazy, cached at module level)
//------------------------------------------------------------------

/** Cached doc registry -- built once on first call to `loadDoc`. */
let cachedRegistry: DocEntry[] | null = null;

/** Get the doc registry, building it on first access. */
function getRegistry(): DocEntry[] {
    if (!cachedRegistry) {
        cachedRegistry = buildRegistry(resolveRepoRoot());
    }
    return cachedRegistry;
}

//------------------------------------------------------------------
// Document loading
//------------------------------------------------------------------

/**
 * Load a document's full content by ID from the doc registry.
 *
 * The registry metadata is cached (built once), but content is loaded fresh
 * each call to avoid stale content (per research Pitfall 2).
 *
 * @returns The document content, or empty string if the doc ID is not found.
 */
export function loadDoc(docId: string): string {
    const entry = getRegistry().find(e => e.id === docId);
    if (!entry) return '';
    return loadDocContent(entry);
}

//------------------------------------------------------------------
// Markdown section extraction
//------------------------------------------------------------------

/** Escape special regex characters in a string. */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract a named section from markdown content.
 *
 * Matches `## {sectionName}` or `### {sectionName}` and returns everything
 * from that header to the next header of equal or higher level, or end of
 * string. Returns the content without the header itself, trimmed.
 *
 * @returns The section content, or empty string if the section is not found.
 */
export function extractSection(markdown: string, sectionName: string): string {
    const escaped = escapeRegex(sectionName);

    // Match ## or ### headers, capture content up to next header of same/higher level or EOF.
    const h2Regex = new RegExp(`^## ${escaped}\\s*\\n([\\s\\S]*?)(?=^## |$)`, 'm');
    const h2Match = markdown.match(h2Regex);
    if (h2Match) return h2Match[1].trim();

    const h3Regex = new RegExp(`^### ${escaped}\\s*\\n([\\s\\S]*?)(?=^#{1,3} |$)`, 'm');
    const h3Match = markdown.match(h3Regex);
    if (h3Match) return h3Match[1].trim();

    return '';
}

//------------------------------------------------------------------
// Type formatting
//------------------------------------------------------------------

/**
 * Format a single symbol's detail as a readable markdown block.
 *
 * Calls `ensureInitialized()` then `getSymbolDetail(name)` from ts-registry.
 * Output uses the markdown-header style established in Phase 3.
 *
 * @returns A formatted markdown block, or a "not found" message.
 */
export function formatSymbolSummary(name: string): string {
    ensureInitialized();
    const detail = getSymbolDetail(name);
    if (!detail) return `(Symbol '${name}' not found)`;

    const lines: string[] = [
        `### ${detail.name} (${detail.kind})`,
        `Package: ${detail.sourcePackage}`
    ];

    if (detail.extends) lines.push(`Extends: ${detail.extends}`);
    if (detail.jsDoc) lines.push('', detail.jsDoc);

    lines.push('', '```typescript', detail.signature, '```');

    return lines.join('\n');
}

/**
 * Format selected members of a class or interface.
 *
 * Calls `getMembers(symbolName)` from ts-registry. Filters the returned
 * members to only those whose name appears in `memberNames`. If memberNames
 * is empty or not provided, includes all members but caps at 15.
 *
 * Each member is formatted as:
 * - `name: type` (for properties/accessors)
 * - `name(params): returnType` (for methods)
 * with the first line of JSDoc as an indented description below.
 *
 * @returns The formatted member list as a string.
 */
export function formatKeyMembers(symbolName: string, memberNames?: string[]): string {
    ensureInitialized();
    const result = getMembers(symbolName);
    if (!result) return `(Symbol '${symbolName}' not found or has no members)`;

    let {members} = result;

    if (memberNames && memberNames.length > 0) {
        const nameSet = new Set(memberNames);
        members = members.filter(m => nameSet.has(m.name));
    } else {
        members = members.slice(0, 15);
    }

    if (members.length === 0) return '(No matching members found)';

    const lines: string[] = [];
    for (const member of members) {
        if (member.kind === 'method') {
            const params = (member.parameters ?? []).map(p => `${p.name}: ${p.type}`).join(', ');
            const ret = member.returnType ?? 'void';
            lines.push(`- ${member.name}(${params}): ${ret}`);
        } else {
            lines.push(`- ${member.name}: ${member.type}`);
        }

        if (member.jsDoc) {
            const firstLine = member.jsDoc.split('\n')[0].trim();
            if (firstLine) lines.push(`  ${firstLine}`);
        }
    }

    return lines.join('\n');
}

//------------------------------------------------------------------
// Conventions
//------------------------------------------------------------------

/**
 * Returns a static string block of key Hoist conventions that every prompt
 * should include. Ensures LLMs generate idiomatic Hoist code.
 */
export function hoistConventionsSection(): string {
    return [
        '## Key Hoist Conventions',
        '- Use element factories, NOT JSX: `grid({model})` not `<Grid model={model} />`',
        '- Models extend HoistModel; mark child models with `@managed`',
        '- Call `makeObservable(this)` in the constructor',
        '- Data loading goes in `override async doLoadAsync(loadSpec) { ... }`',
        '- Use `@bindable` for observable properties that need auto-generated setters',
        '- Import from `@xh/hoist/...` paths (e.g. `@xh/hoist/cmp/grid`, `@xh/hoist/core`)',
        '- Use `creates(ModelClass)` in component to create/bind model instance',
        '- Use `hoistCmp.factory()` to create component factories'
    ].join('\n');
}
