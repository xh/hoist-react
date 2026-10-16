/**
 * Test harness for companion library docs. Run with:
 *   npx tsx mcp/data/companion-docs.spec.ts
 *
 * Self-contained, exit-coded driver (the repo has no general test framework). Builds a fixture
 * consumer app in a temp directory, with a fake opted-in library `@acme/hoist-acme` installed
 * under `node_modules` through a pnpm-style symlink. Its doc ids collide with hoist-react's on
 * purpose (`docs/README.md`, `core/README.md`, the `index` alias). Covers:
 *   - app root resolution: the env override, `cwd`, and `cwd/client-app`
 *   - discovery, id prefixing, path safety, and load warnings
 *   - alias scoping: hoist-react keeps its bare names, companion aliases live under the prefix
 *   - search, reads, and the library filter
 *   - rewriting relative links in companion docs to full ids
 *   - library guidance from `mcpInstructions`: normalizing, the length cap, and bad values
 *   - the MCP tools, resources, and server instructions, and the CLI run from the app
 *
 * Uses a fixture rather than the real hoist-chat-kit, whose docs change too fast to test against.
 */
import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';

import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

import {
    buildRegistry,
    MAX_LIBRARY_INSTRUCTIONS_CHARS,
    rewriteRelativeLinks,
    type DocEntry
} from './doc-registry.js';
import {resolveDocId} from './doc-id-resolver.js';
import {searchDocs} from './doc-search.js';
import {readDoc} from '../formatters/docs.js';
import {buildServerInstructions} from '../instructions.js';
import {registerDocResources} from '../resources/docs.js';
import {registerDocTools} from '../tools/docs.js';
import {resolveAppRoot, resolveRepoRoot} from '../util/paths.js';

process.env.HOIST_MCP_QUIET = '1';

let passed = 0,
    failed = 0;

function check(name: string, ok: boolean, detail?: unknown) {
    if (ok) {
        passed++;
        console.log(`  PASS  ${name}`);
    } else {
        failed++;
        const shown = typeof detail === 'string' ? detail : JSON.stringify(detail);
        console.log(`  FAIL  ${name}${detail !== undefined ? `\n          ${shown}` : ''}`);
    }
}

//------------------------------------------------------------------
// Fixture
//------------------------------------------------------------------
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'hoist-companion-docs-'))),
    appDir = join(tmp, 'app'),
    clientApp = join(appDir, 'client-app'),
    acmeStore = join(tmp, 'store', 'hoist-acme'),
    acmeLink = join(clientApp, 'node_modules/@acme/hoist-acme');

function write(path: string, content: unknown) {
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
}

// Standard Hoist app layout - package.json under client-app/, none at the root.
write(join(clientApp, 'package.json'), {
    name: 'fixture-app',
    dependencies: {
        '@acme/hoist-acme': '2.3.4',
        '@acme/broken': '1.0.0',
        'plain-dep': '1.0.0',
        '@acme/long-guide': '1.0.0',
        '@acme/bad-guide': '1.0.0'
    },
    devDependencies: {'@xh/hoist': '*', 'not-installed': '1.0.0'}
});

// The library lives outside node_modules and is linked in, as pnpm does.
write(join(acmeStore, 'package.json'), {
    name: '@acme/hoist-acme',
    version: '2.3.4',
    description: 'Acme overrides and components for Hoist apps.',
    hoist: {docRegistry: 'docs/doc-registry.json'}
});
write(join(acmeStore, 'docs/doc-registry.json'), {
    mcpInstructions: ['  Use acmeGrid instead of grid.  ', '', 'Fetch through AcmeFetchService.'],
    mcpCategories: [
        {id: 'package', title: 'Package Documentation'},
        {id: 'index', title: 'Index'}
    ],
    entries: [
        {
            id: 'docs/README.md',
            title: 'Acme Index',
            mcpCategory: 'index',
            description: 'Catalog of Acme docs.',
            aliases: ['index']
        },
        // An unknown audience warns, and the doc loads for everyone.
        {
            id: 'core/README.md',
            title: 'Acme Core',
            description: 'Acme core models.',
            mcpAudience: 'everyone'
        },
        // Minimal entry, with a category the registry does not declare.
        {id: 'docs/widgets.md', mcpCategory: 'recipes'},
        // For agents in the library's own repo only.
        {id: 'docs/maintaining.md', mcpCategory: 'conventions', mcpAudience: 'maintainers'},
        {id: 'docs/missing.md'},
        // A symlink to a file outside the package.
        {id: 'docs/linked.md'},
        {id: '../escape.md'}
    ]
});
write(join(acmeStore, 'docs/README.md'), '# Acme Index\n\nStart here for Acme docs.\n');
write(
    join(acmeStore, 'core/README.md'),
    '# Acme Core\n\n## AcmeModel\n\nAcmeModel wraps a GridModel and adds frobnication of quarterly ledgers.\n'
);
write(
    join(acmeStore, 'docs/widgets.md'),
    '# Widgets\n\n## Frobnicate\n\nCall frobnicateWidgetsAsync() to frobnicate every widget on the dashboard.\n' +
        'See [AcmeModel](../core/README.md#acmemodel).\n'
);
write(join(acmeStore, 'docs/maintaining.md'), '# Maintaining Acme\n\n## Release\n\nTag it.\n');
mkdirSync(join(clientApp, 'node_modules/@acme'), {recursive: true});
write(join(tmp, 'outside.md'), '# Outside\n');
symlinkSync(join(tmp, 'outside.md'), join(acmeStore, 'docs/linked.md'));
symlinkSync(acmeStore, acmeLink, 'dir');

// Opted in, but its registry file is missing.
write(join(clientApp, 'node_modules/@acme/broken/package.json'), {
    name: '@acme/broken',
    version: '1.0.0',
    hoist: {docRegistry: 'docs/nope.json'}
});

// Opted in with guidance that is too long, and with guidance of the wrong type. No docs.
for (const [name, mcpInstructions] of [
    ['long-guide', 'x'.repeat(MAX_LIBRARY_INSTRUCTIONS_CHARS + 100)],
    ['bad-guide', {use: 'acmeGrid'}]
] as const) {
    const dir = join(clientApp, 'node_modules/@acme', name);
    write(join(dir, 'package.json'), {
        name: `@acme/${name}`,
        version: '1.0.0',
        hoist: {docRegistry: 'registry.json'}
    });
    write(join(dir, 'registry.json'), {mcpInstructions, entries: []});
}

// Not opted in. Installed one level up, to exercise the walk up through node_modules.
write(join(appDir, 'node_modules/plain-dep/package.json'), {name: 'plain-dep', version: '1.0.0'});

// A root with a tooling package.json that does not use Hoist, over a client-app/ that does.
const toolingRoot = join(tmp, 'tooling');
write(join(toolingRoot, 'package.json'), {name: 'tooling', devDependencies: {husky: '*'}});
write(join(toolingRoot, 'client-app/package.json'), {name: 'x', dependencies: {'@xh/hoist': '*'}});

//------------------------------------------------------------------
// App root resolution
//------------------------------------------------------------------
console.log('App root resolution:');
check('cwd with client-app/ resolves to client-app', resolveAppRoot(appDir, {}) === clientApp);
check('cwd with package.json resolves to cwd', resolveAppRoot(clientApp, {}) === clientApp);
check(
    'HOIST_MCP_APP_ROOT wins over cwd',
    resolveAppRoot(tmp, {HOIST_MCP_APP_ROOT: clientApp}) === clientApp
);
check(
    'a client-app/ using Hoist wins over a root package.json that does not',
    resolveAppRoot(toolingRoot, {}) === join(toolingRoot, 'client-app')
);
check('no package.json resolves to null', resolveAppRoot(join(tmp, 'store'), {}) === null);

//------------------------------------------------------------------
// Discovery and loading
//------------------------------------------------------------------
console.log('Discovery and loading:');
const repoRoot = resolveRepoRoot(),
    hoistOnly = buildRegistry(repoRoot),
    data = buildRegistry(repoRoot, {appRoot: clientApp}),
    acme = data.libraries.find(l => l.name === '@acme/hoist-acme'),
    acmeIds = data.entries.filter(e => e.library === '@acme/hoist-acme').map(e => e.id);

check(
    'loads hoist-react plus each opted-in library with a readable registry',
    data.libraries.map(l => l.name).join() ===
        '@xh/hoist,@acme/hoist-acme,@acme/long-guide,@acme/bad-guide',
    data.libraries.map(l => l.name)
);
check(
    'library carries version, real path root, link source path, index id, and doc count',
    acme?.version === '2.3.4' &&
        acme.root === acmeStore &&
        acme.sourcePath === acmeLink &&
        acme.indexId === '@acme/hoist-acme/docs/README.md' &&
        acme.docCount === 3,
    acme
);
check(
    'companion ids are prefixed with the package name',
    acmeIds.join() ===
        '@acme/hoist-acme/docs/README.md,@acme/hoist-acme/core/README.md,@acme/hoist-acme/docs/widgets.md',
    acmeIds
);
check(
    'hoist-react ids are unchanged',
    data.entries.filter(e => e.library == null).length === hoistOnly.entries.length &&
        data.entries.some(e => e.id === 'core/README.md' && e.library == null)
);
check(
    'a minimal entry gets defaults',
    (() => {
        const e = data.entries.find(it => it.id === '@acme/hoist-acme/docs/widgets.md');
        return e?.title === 'docs/widgets.md' && e.description === '' && e.keywords.length === 0;
    })()
);
check(
    'an undeclared category joins the union with a derived title',
    data.mcpCategories.some(c => c.id === 'recipes' && c.title === 'Recipes') &&
        data.mcpCategories[0].id === hoistOnly.mcpCategories[0].id
);
for (const [name, fragment] of [
    ['missing registry file', '@acme/broken: doc registry not found'],
    ['missing doc file', 'docs/missing.md'],
    ['path traversal', '../escape.md'],
    ['a symlink out of the package', '"docs/linked.md": it links to a file outside']
]) {
    check(
        `warns on ${name}`,
        data.warnings.some(w => w.includes(fragment)),
        data.warnings
    );
}
check('hoist-only build has no companions', hoistOnly.libraries.length === 1);
check(
    'skips a maintainers doc for an app that installs the library',
    !data.entries.some(e => e.path === 'docs/maintaining.md')
);
{
    const own = buildRegistry(repoRoot, {appRoot: acmeStore}),
        ownIds = own.entries.filter(e => e.library === '@acme/hoist-acme').map(e => e.path);
    check(
        "serves a maintainers doc in the library's own repo",
        ownIds.includes('docs/maintaining.md') && ownIds.length === 4,
        ownIds
    );
}
check(
    'warns on an unknown mcpAudience and loads the doc',
    data.warnings.some(w => w.includes('ignored mcpAudience "everyone" on "core/README.md"')) &&
        acmeIds.includes('@acme/hoist-acme/core/README.md'),
    data.warnings
);

//------------------------------------------------------------------
// Library guidance
//------------------------------------------------------------------
console.log('Library guidance:');
{
    const guide = (name: string) => data.libraries.find(l => l.name === name)?.instructions;
    check(
        'joins array lines, trims them, and drops blank ones',
        guide('@acme/hoist-acme') ===
            'Use acmeGrid instead of grid.\nFetch through AcmeFetchService.',
        guide('@acme/hoist-acme')
    );
    check(
        'cuts guidance over the cap and warns',
        guide('@acme/long-guide')?.length === MAX_LIBRARY_INSTRUCTIONS_CHARS &&
            data.warnings.some(w => w.startsWith('@acme/long-guide: mcpInstructions cut')),
        data.warnings
    );
    check(
        'ignores guidance of the wrong type and warns',
        guide('@acme/bad-guide') === null &&
            data.warnings.some(w => w.startsWith('@acme/bad-guide: ignored mcpInstructions')),
        data.warnings
    );
    check('hoist-react has no library guidance', data.libraries[0].instructions === null);
}

//------------------------------------------------------------------
// Resolver
//------------------------------------------------------------------
console.log('Resolver:');
const reg = data.entries,
    resolved = (input: string) => {
        const r = resolveDocId(reg, input);
        return r.kind === 'unknown' ? null : r.entry.id;
    };

for (const [input, expect] of [
    ['core', 'core/README.md'],
    ['index', 'docs/README.md'],
    ['@acme/hoist-acme/core/README.md', '@acme/hoist-acme/core/README.md'],
    ['@acme/hoist-acme/core', '@acme/hoist-acme/core/README.md'],
    ['hoist-acme/core', '@acme/hoist-acme/core/README.md'],
    ['hoist-acme/core/README.md', '@acme/hoist-acme/core/README.md'],
    ['@acme/hoist-acme/index', '@acme/hoist-acme/docs/README.md'],
    ['hoist-acme/index', '@acme/hoist-acme/docs/README.md'],
    ['@acme/hoist-acme', '@acme/hoist-acme/docs/README.md'],
    ['hoist-acme', '@acme/hoist-acme/docs/README.md'],
    ['@acme/hoist-acme/widgets', '@acme/hoist-acme/docs/widgets.md'],
    ['HOIST-ACME/WIDGETS', '@acme/hoist-acme/docs/widgets.md'],
    ['widgets', null]
] as const) {
    check(`"${input}" → ${expect ?? 'unknown'}`, resolved(input) === expect, resolved(input));
}
{
    const r = resolveDocId(reg, 'widgets');
    check(
        'a bare companion name suggests the prefixed id',
        r.kind === 'unknown' && r.suggestions.includes('@acme/hoist-acme/docs/widgets.md'),
        r
    );
}

// Synthetic registries for collisions the fixture does not produce.
const mock = (id: string, library: string | null, aliases: string[] = []): DocEntry => ({
    id: library ? `${library}/${id}` : id,
    path: id,
    library,
    title: id,
    filePath: `/dev/null/${id}`,
    mcpCategory: 'package',
    description: '',
    keywords: [],
    aliases
});
{
    // `@acme/grid`'s index claims the bare alias `grid`, as does hoist's grid README.
    const r = [mock('cmp/grid/README.md', null), mock('docs/README.md', '@acme/grid')];
    check(
        'hoist-react keeps a bare alias a companion package name collides with',
        resolveDocId(r, 'grid').kind !== 'unknown' &&
            (resolveDocId(r, 'grid') as {entry: DocEntry}).entry.id === 'cmp/grid/README.md'
    );
    check(
        'the colliding companion index is still reachable by full name',
        (resolveDocId(r, '@acme/grid') as {entry?: DocEntry}).entry?.id ===
            '@acme/grid/docs/README.md'
    );
}
{
    // Two libraries share the unscoped name `kit` and both declare the alias `index`.
    const r = [
        mock('docs/README.md', '@a/kit', ['index']),
        mock('docs/README.md', '@b/kit', ['index'])
    ];
    check('a shared unscoped prefix is ambiguous', resolveDocId(r, 'kit/index').kind === 'unknown');
    check(
        'each full-prefix explicit alias resolves to its own library',
        (resolveDocId(r, '@a/kit/index') as {entry?: DocEntry}).entry?.id ===
            '@a/kit/docs/README.md' &&
            (resolveDocId(r, '@b/kit/index') as {entry?: DocEntry}).entry?.id ===
                '@b/kit/docs/README.md'
    );
}

//------------------------------------------------------------------
// Search and read
//------------------------------------------------------------------
console.log('Search and read:');
{
    const hits = searchDocs(reg, 'frobnicate widgets');
    check(
        'search finds the companion doc first',
        hits[0]?.entry.id === '@acme/hoist-acme/docs/widgets.md',
        hits.map(h => h.entry.id)
    );
    const hoistHits = searchDocs(reg, 'frobnicate widgets', {library: '@xh/hoist'});
    check(
        'library filter excludes other libraries',
        hoistHits.every(h => h.entry.library == null),
        hoistHits.map(h => h.entry.id)
    );
    const acmeHits = searchDocs(reg, 'GridModel', {library: '@acme/hoist-acme'});
    check(
        'library filter limits to one companion',
        acmeHits.length > 0 && acmeHits.every(h => h.entry.library === '@acme/hoist-acme'),
        acmeHits.map(h => h.entry.id)
    );
}
{
    const r = readDoc(reg, {id: 'hoist-acme/core', section: 'AcmeModel'}, 'mcp');
    check(
        'reads a companion section by unscoped id',
        r.ok && r.structured.id === '@acme/hoist-acme/core/README.md' && r.text.includes('frob'),
        r
    );
    const w = readDoc(reg, {id: '@acme/hoist-acme/widgets', section: 'Frobnicate'}, 'mcp');
    check(
        'a companion read rewrites relative links to full ids',
        w.ok && w.text.includes('[AcmeModel](@acme/hoist-acme/core/README.md#acmemodel)'),
        w
    );
}

//------------------------------------------------------------------
// Relative link rewriting
//------------------------------------------------------------------
console.log('Relative link rewriting:');
{
    const rewrite = (line: string) =>
        rewriteRelativeLinks(line, 'docs/guide.md', {
            library: '@acme/kit',
            docPaths: new Set(['core/README.md', 'docs/other.md', 'docs/x.md', 'docs/z.md']),
            sourcePath: 'node_modules/@acme/kit'
        });
    for (const [input, expect] of [
        ['[a](../core/README.md)', '[a](@acme/kit/core/README.md)'],
        ['[a](./other.md#part)', '[a](@acme/kit/docs/other.md#part)'],
        ['[a](other.md "Title")', '[a](@acme/kit/docs/other.md "Title")'],
        ['[a](<../core/README.md>)', '[a](<@acme/kit/core/README.md>)'],
        ['[ref]: ../core/README.md', '[ref]: @acme/kit/core/README.md'],
        ['[a](..)', '[a](@acme/kit)'],
        ['[a](../core/AcmeModel.ts#L10)', '[a](node_modules/@acme/kit/core/AcmeModel.ts#L10)'],
        ['[a](./unserved.md)', '[a](node_modules/@acme/kit/docs/unserved.md)'],
        ['[a](#part)', '[a](#part)'],
        ['[a](https://xh.io/x.md)', '[a](https://xh.io/x.md)'],
        ['[a](mailto:x@xh.io)', '[a](mailto:x@xh.io)'],
        ['[a](/abs.md)', '[a](/abs.md)'],
        ['[a](../../hoist-react/core/README.md)', '[a](../../hoist-react/core/README.md)'],
        ['`[a](../core/README.md)`', '`[a](../core/README.md)`'],
        ['[`/core/`](../core/README.md)', '[`/core/`](@acme/kit/core/README.md)']
    ] as const) {
        check(`${input} → ${expect}`, rewrite(input) === expect, rewrite(input));
    }
    const fenced = '[a](x.md)\n```md\n[b](y.md)\n```\n[c](z.md)';
    check(
        'leaves fenced code blocks as written and keeps line count',
        rewrite(fenced) ===
            '[a](@acme/kit/docs/x.md)\n```md\n[b](y.md)\n```\n[c](@acme/kit/docs/z.md)',
        rewrite(fenced)
    );
    const nested = '1. Item\n\n    ````md\n    ```\n    [b](y.md)\n    ````\n[c](z.md)';
    check(
        'leaves a fence indented in a list item, and a shorter inner fence, as written',
        rewrite(nested) === nested.replace('[c](z.md)', '[c](@acme/kit/docs/z.md)'),
        rewrite(nested)
    );
}

//------------------------------------------------------------------
// MCP tools, resources, and instructions
//------------------------------------------------------------------
console.log('MCP surfaces:');
{
    const server = new McpServer({name: 'companion-spec', version: '0.0.0'});
    registerDocTools(server, data);
    registerDocResources(server, data);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair(),
        client = new Client({name: 'spec', version: '0.0.0'});
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const call = async (name: string, args: Record<string, unknown>) => {
        const res = await client.callTool({name, arguments: args});
        return {
            text: (res.content as Array<{text: string}>)[0].text,
            structured: res.structuredContent as Record<string, unknown>
        };
    };

    const ping = await call('hoist-ping', {});
    check(
        'ping names the companion library, its guidance, and its problems',
        ping.text.includes('@acme/hoist-acme 2.3.4: 3 docs') &&
            ping.text.includes('  Guidance:\n    Use acmeGrid instead of grid.') &&
            ping.text.includes('Companion library problems:'),
        ping.text
    );

    const {tools} = await client.listTools(),
        searchTool = tools.find(t => t.name === 'hoist-search-docs')!;
    check(
        'search tool offers a library filter and names the companion',
        'library' in (searchTool.inputSchema.properties ?? {}) &&
            searchTool.description!.includes('@acme/hoist-acme')
    );

    const list = await call('hoist-list-docs', {library: '@acme/hoist-acme'}),
        listed = list.structured.entries as Array<{id: string; library: string}>;
    check(
        'list filters by library and labels entries',
        listed.length === 3 && listed.every(e => e.library === '@acme/hoist-acme'),
        list.structured
    );
    const fullList = await call('hoist-list-docs', {});
    check(
        'full list puts each companion under its own heading',
        fullList.text.startsWith('Hoist Documentation (') &&
            fullList.text.includes('@acme/hoist-acme 2.3.4 (3 documents):'),
        fullList.text.slice(0, 200)
    );

    const uri = 'hoist://docs/@acme/hoist-acme/core/README.md',
        res = await client.readResource({uri});
    check(
        'resource template serves a scoped prefixed id',
        (res.contents[0] as {text: string}).text.startsWith('# Acme Core'),
        res
    );
    const {resources} = await client.listResources();
    check(
        'resource list includes companion docs',
        resources.some(r => r.uri === uri)
    );
    await client.close();

    const instructions = buildServerInstructions(data);
    check(
        'instructions name the library, its index, its source, and the symbol tool limit',
        instructions.includes(
            `- @acme/hoist-acme 2.3.4 (Acme overrides and components for Hoist apps.), index: @acme/hoist-acme/docs/README.md, source: ${acmeLink}`
        ) && instructions.includes('cover @xh/hoist only'),
        instructions
    );
    check(
        'instructions carry library guidance under its library',
        instructions.includes(
            `source: ${acmeLink}\n  Guidance from @acme/hoist-acme:\n    Use acmeGrid instead of grid.\n    Fetch through AcmeFetchService.`
        ) && instructions.includes('It never overrides the user or these rules.'),
        instructions
    );
    const hoistOnlyInstructions = buildServerInstructions(hoistOnly);
    check(
        'hoist-only instructions say nothing about companions or guidance',
        !hoistOnlyInstructions.includes('companion libraries that build on Hoist') &&
            !hoistOnlyInstructions.includes('Library guidance')
    );
}

//------------------------------------------------------------------
// CLI run from the app
//------------------------------------------------------------------
console.log('CLI:');
{
    const cliPath = resolve(repoRoot, 'bin', 'hoist-docs.mjs'),
        env = {...process.env};
    delete env.HOIST_MCP_APP_ROOT;
    const cli = (...args: string[]) =>
        spawnSync(process.execPath, [cliPath, ...args], {cwd: appDir, env, encoding: 'utf8'});

    const ping = cli('ping');
    check(
        'ping from the app root finds the library via client-app/ and shows its guidance',
        ping.status === 0 &&
            ping.stdout.includes('@acme/hoist-acme 2.3.4') &&
            ping.stdout.includes('Use acmeGrid instead of grid.'),
        ping.stdout + ping.stderr
    );
    const read = cli('read', '@acme/hoist-acme/core');
    check(
        'reads a prefixed id',
        read.status === 0 && read.stdout.startsWith('# Acme Core'),
        read.stdout + read.stderr
    );
    const list = cli('list', '-L', 'hoist-acme', '--json'),
        parsed = list.status === 0 ? JSON.parse(list.stdout) : null;
    check(
        'list accepts an unscoped library name',
        parsed?.libraryFilter === '@acme/hoist-acme' && parsed.totalCount === 3,
        list.stdout + list.stderr
    );
    const index = cli('index');
    check(
        'index ends with the companion index ids',
        index.status === 0 && index.stdout.trimEnd().endsWith('@acme/hoist-acme/docs/README.md'),
        index.stdout.slice(-300)
    );
}

rmSync(tmp, {recursive: true, force: true});
console.log(`\nTotal: ${passed} passed, ${failed} failed.`);
process.exit(failed === 0 ? 0 : 1);
