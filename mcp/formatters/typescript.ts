/**
 * Shared formatting functions for TypeScript symbol and member results.
 *
 * Used by both the MCP tools (`tools/typescript.ts`) and the CLI (`cli/ts.ts`)
 * to produce identical output from the same data.
 */
import type {MemberInfo, MemberIndexEntry, SymbolEntry, SymbolDetail} from '../data/ts-registry.js';
import {resolveRepoRoot} from '../util/paths.js';

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
 */
export function formatMemberIndexEntry(entry: MemberIndexEntry, index: number): string {
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
        });
    }

    if (memberResults.length > 0) {
        if (lines.length > 0) lines.push('');
        lines.push(`Members of key classes (${memberResults.length} matches):\n`);
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
export function formatSymbolDetail(detail: SymbolDetail | null, name: string): string {
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

    lines.push('');
    lines.push('## Signature');
    lines.push(detail.signature);

    if (detail.jsDoc) {
        lines.push('');
        lines.push('## Documentation');
        lines.push(detail.jsDoc);
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

    return lines.join('\n');
}
