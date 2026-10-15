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

import {buildRegistry, type DocEntry} from './doc-registry.js';
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
    acmeStore = join(tmp, 'store', 'hoist-acme');

function write(path: string, content: unknown) {
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
}

// Standard Hoist app layout - package.json under client-app/, none at the root.
write(join(clientApp, 'package.json'), {
    name: 'fixture-app',
    dependencies: {'@acme/hoist-acme': '2.3.4', '@acme/broken': '1.0.0', 'plain-dep': '1.0.0'},
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
        {id: 'core/README.md', title: 'Acme Core', description: 'Acme core models.'},
        // Minimal entry, with a category the registry does not declare.
        {id: 'docs/widgets.md', mcpCategory: 'recipes'},
        {id: 'docs/missing.md'},
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
    '# Widgets\n\n## Frobnicate\n\nCall frobnicateWidgetsAsync() to frobnicate every widget on the dashboard.\n'
);
mkdirSync(join(clientApp, 'node_modules/@acme'), {recursive: true});
symlinkSync(acmeStore, join(clientApp, 'node_modules/@acme/hoist-acme'), 'dir');

// Opted in, but its registry file is missing.
write(join(clientApp, 'node_modules/@acme/broken/package.json'), {
    name: '@acme/broken',
    version: '1.0.0',
    hoist: {docRegistry: 'docs/nope.json'}
});

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
    'loads hoist-react plus the one opted-in library',
    data.libraries.map(l => l.name).join() === '@xh/hoist,@acme/hoist-acme',
    data.libraries.map(l => l.name)
);
check(
    'library carries version, real path root, index id, and doc count',
    acme?.version === '2.3.4' &&
        acme.root === acmeStore &&
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
    ['path traversal', '../escape.md']
]) {
    check(
        `warns on ${name}`,
        data.warnings.some(w => w.includes(fragment)),
        data.warnings
    );
}
check('hoist-only build has no companions', hoistOnly.libraries.length === 1);

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
        'ping names the companion library and its problems',
        ping.text.includes('@acme/hoist-acme 2.3.4: 3 docs') &&
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
        'instructions name the library, its index, and the symbol tool limit',
        instructions.includes(
            '- @acme/hoist-acme 2.3.4 (Acme overrides and components for Hoist apps.), index: @acme/hoist-acme/docs/README.md'
        ) && instructions.includes('cover @xh/hoist only'),
        instructions
    );
    check(
        'hoist-only instructions say nothing about companions',
        !buildServerInstructions(hoistOnly).includes('companion libraries that build on Hoist')
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
        'ping from the app root finds the library via client-app/',
        ping.status === 0 && ping.stdout.includes('@acme/hoist-acme 2.3.4'),
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
