/**
 * Build the Hoist Docs index file for this hoist-react checkout.
 *
 * Writes one JSON file (schema v1, see the hoist-docs repo's `docs/index-schema.md`) holding the
 * doc registry and markdown, every indexed symbol with its detail and members precomputed, and the
 * member search index. The Hoist Docs service reads this file; it never parses hoist-react source.
 *
 * Usage: `pnpm build:index [--out <dir>] [--gzip]`. Default output dir is `build/docs-index`.
 */
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {gzipSync} from 'node:zlib';

import {loadDocContent, loadRegistry} from '../data/doc-registry.js';
import {
    getIndexes,
    getMembers,
    getSymbolDetail,
    isPromiseExtension,
    type MemberIndexEntry,
    type SymbolEntry
} from '../data/ts-registry.js';
import {readPackageJson, resolveRepoRoot, resolveRepoRootPosix} from '../util/paths.js';

export const SCHEMA_VERSION = 1;

/** Build the index object in memory. */
export async function buildIndex(): Promise<object> {
    const repoRoot = resolveRepoRoot(),
        posixRoot = resolveRepoRootPosix(),
        rel = (p: string) => (p.startsWith(posixRoot + '/') ? p.slice(posixRoot.length + 1) : p),
        pkg = readPackageJson(repoRoot);

    // Docs - hoist-react's own registry only. Companion libraries build their own index.
    const registry = loadRegistry(),
        rawRegistry = JSON.parse(
            loadDocContent({filePath: resolve(repoRoot, 'docs/doc-registry.json')} as any)
        ),
        viewerCategoryById = new Map<string, string>(
            rawRegistry.entries.map((e: any) => [e.id, e.viewerCategory])
        );

    const docEntries = registry.entries
        .filter(e => e.library == null)
        .map(e => ({
            id: e.id,
            title: e.title,
            mcpCategory: e.mcpCategory,
            viewerCategory: viewerCategoryById.get(e.id) ?? null,
            description: e.description,
            keywords: e.keywords,
            aliases: e.aliases,
            markdown: loadDocContent(e)
        }));

    // Symbols - every entry, with detail and (for classes and interfaces) all members.
    const {symbols, members} = await getIndexes(),
        allEntries: SymbolEntry[] = [...symbols.values()].flat(),
        outSymbols = [];

    for (const entry of allEntries) {
        const detail = await getSymbolDetail(entry.name, {
            filePath: entry.filePath,
            kind: entry.kind
        });
        const sym: any = {
            name: entry.name,
            kind: entry.kind,
            filePath: rel(entry.filePath),
            sourcePackage: entry.sourcePackage,
            isExported: entry.isExported,
            importPath: entry.importPath,
            isPromiseExtension: isPromiseExtension(entry) || undefined,
            doc: entry.jsDoc,
            hint: entry.mcpHint,
            memberNames: entry.memberNames || undefined,
            signature: detail?.signature ?? '',
            extends: detail?.extends,
            implements: detail?.implements?.length ? detail.implements : undefined,
            decorators: detail?.decorators?.length ? detail.decorators : undefined,
            constructorType: detail?.constructorType,
            instanceOf: detail?.instanceOf
        };

        if (entry.kind === 'class' || entry.kind === 'interface') {
            const result = await getMembers(entry.name, {filePath: entry.filePath});
            if (result.ok && result.symbol.filePath === entry.filePath) {
                sym.members = result.members.map(m => ({
                    name: m.name,
                    kind: m.kind,
                    type: m.type,
                    isStatic: m.isStatic,
                    isOptional: m.isOptional,
                    decorators: m.decorators,
                    doc: m.jsDoc,
                    default: m.default,
                    parameters: m.parameters,
                    returnType: m.returnType,
                    returns: m.returns,
                    inheritedFrom: m.inheritedFrom,
                    docInheritedFrom: m.jsDocInheritedFrom
                }));
                if (result.externalMembers.length) sym.externalMembers = result.externalMembers;
            }
        }
        outSymbols.push(sym);
    }

    const memberIndex = [...members.values()].flat().map((m: MemberIndexEntry) => ({
        name: m.name,
        memberKind: m.memberKind,
        ownerName: m.ownerName,
        ownerHint: m.ownerHint,
        filePath: rel(m.filePath),
        sourcePackage: m.sourcePackage,
        isStatic: m.isStatic,
        type: m.type,
        doc: m.jsDoc,
        docInheritedFrom: m.jsDocInheritedFrom,
        default: m.default,
        decorators: m.decorators
    }));

    return {
        schemaVersion: SCHEMA_VERSION,
        library: {
            id: 'react',
            name: pkg?.name ?? '@xh/hoist',
            version: pkg?.version ?? 'unknown',
            language: 'typescript',
            gitSha: gitSha(repoRoot),
            builtAt: new Date().toISOString(),
            description: pkg?.description ?? null
        },
        docs: {
            mcpCategories: registry.mcpCategories,
            viewerCategories: rawRegistry.viewerCategories ?? [],
            entries: docEntries
        },
        symbols: outSymbols,
        memberIndex
    };
}

function gitSha(dir: string): string | null {
    try {
        return execFileSync('git', ['rev-parse', 'HEAD'], {cwd: dir, encoding: 'utf8'}).trim();
    } catch {
        return null;
    }
}

//------------------------------------------------------------------
// CLI entry point
//------------------------------------------------------------------
async function main() {
    const args = process.argv.slice(2),
        outIdx = args.indexOf('--out'),
        outDir = resolve(outIdx >= 0 ? args[outIdx + 1] : 'build/docs-index'),
        gzip = args.includes('--gzip');

    const start = Date.now(),
        index: any = await buildIndex(),
        json = JSON.stringify(index),
        fileName = `react-${index.library.version}.json${gzip ? '.gz' : ''}`;

    mkdirSync(outDir, {recursive: true});
    const outPath = resolve(outDir, fileName);
    writeFileSync(outPath, gzip ? gzipSync(json) : json);

    console.log(
        `Wrote ${outPath}: ${index.docs.entries.length} docs, ${index.symbols.length} symbols, ` +
            `${index.memberIndex.length} member index entries, ` +
            `${(json.length / 1e6).toFixed(1)} MB JSON in ${((Date.now() - start) / 1000).toFixed(1)}s`
    );
}

if (import.meta.url === `file://${process.argv[1]}`) {
    await main();
}
