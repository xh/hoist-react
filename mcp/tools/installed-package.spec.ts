/**
 * Test harness for the developer tools as an app runs them - from an installed `@xh/hoist`.
 * Run with:
 *   npx tsx mcp/tools/installed-package.spec.ts
 *
 * Self-contained, exit-coded driver (the repo has no general test framework). Every other MCP
 * spec runs from the hoist-react checkout, so none can see a bug that appears only when the
 * package root sits under an app's `node_modules`. Two such bugs shipped: an empty symbol index,
 * and every symbol shown as a file import instead of its barrel.
 *
 * Lays out the files `npm pack` would publish under `client-app/node_modules/@xh/hoist` in a
 * temp fixture app, links the package's dependencies from this checkout, and runs the real
 * `hoist-ts` and `hoist-docs` CLIs from the app. Covers:
 *   - the CLIs index and read the installed copy, not this checkout
 *   - symbol lookups return barrel import paths, including through `export type *`
 *   - search, member listings, and doc search and reads return results
 *
 * `mcp/data/import-paths.spec.ts` covers the same path handling in isolation, for more roots.
 */
import {execFileSync, spawnSync} from 'node:child_process';
import {
    cpSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    symlinkSync,
    writeFileSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {resolveRepoRoot} from '../util/paths.js';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(label: string, cond: boolean, detail?: string): void {
    if (cond) {
        passed++;
        console.log(`  PASS  ${label}`);
    } else {
        failed++;
        failures.push(detail ? `${label} -- ${detail}` : label);
        console.log(`  FAIL  ${label}`);
        if (detail) console.log(`        ${detail}`);
    }
}

function eq(label: string, actual: unknown, expected: unknown): void {
    ok(
        label,
        actual === expected,
        `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`
    );
}

//---------------------------------------------------------------------
// Fixture app with an installed @xh/hoist
//---------------------------------------------------------------------

const repoRoot = resolveRepoRoot(),
    tmp = realpathSync(mkdtempSync(join(tmpdir(), 'hoist-installed-package-'))),
    appDir = join(tmp, 'client-app'),
    pkgDir = join(appDir, 'node_modules', '@xh', 'hoist'),
    pkgModules = join(pkgDir, 'node_modules');

/** Copy the published files into the fixture app and link the runtime dependencies. */
function installPackage(): void {
    const packed = JSON.parse(
        execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
            cwd: repoRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        })
    )[0].files.map((f: {path: string}) => f.path) as string[];
    ok('npm pack lists the published files', packed.length > 0, `got ${packed.length}`);

    for (const rel of packed) {
        mkdirSync(dirname(join(pkgDir, rel)), {recursive: true});
        cpSync(join(repoRoot, rel), join(pkgDir, rel));
    }

    // Link only `dependencies`, as an app install provides, so a CLI import of a package that is
    // only a devDependency fails here. Links resolve into this checkout's pnpm store, where each
    // package finds its own dependencies. The index cache that the CLIs write to
    // `node_modules/.cache` lands in the fixture and leaves this checkout's cache alone.
    const {dependencies} = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
    for (const name of Object.keys(dependencies)) {
        const link = join(pkgModules, name);
        mkdirSync(dirname(link), {recursive: true});
        symlinkSync(join(repoRoot, 'node_modules', name), link);
    }

    writeFileSync(
        join(appDir, 'package.json'),
        JSON.stringify({name: 'fixture-app', dependencies: {'@xh/hoist': '*'}})
    );
    ok('package root is under the app node_modules', pkgDir.includes('/node_modules/'), pkgDir);
}

/** Run an installed CLI from the app folder and parse its `--json` output. */
function runJson(bin: string, args: string[]): any {
    const res = spawnSync(process.execPath, [join(pkgDir, 'bin', bin), ...args, '--json'], {
        cwd: appDir,
        encoding: 'utf8'
    });
    if (res.status !== 0) {
        ok(`${bin} ${args.join(' ')} exits 0`, false, `status=${res.status} stderr=${res.stderr}`);
        return null;
    }
    try {
        return JSON.parse(res.stdout);
    } catch (e) {
        ok(`${bin} ${args.join(' ')} prints JSON`, false, `${e}`);
        return null;
    }
}

//---------------------------------------------------------------------
// hoist-ts
//---------------------------------------------------------------------

try {
    console.log('Fixture:');
    installPackage();

    console.log('\nhoist-ts from the installed package:');

    const gridModel = runJson('hoist-ts.mjs', ['symbol', 'GridModel'])?.symbol;
    ok(
        'the index cache is written inside the installed package',
        existsSync(join(pkgModules, '.cache', 'hoist-mcp', 'index-v1.json'))
    );
    eq('GridModel imports from its barrel', gridModel?.importPath, '@xh/hoist/cmp/grid');
    eq('GridModel is a barrel export', gridModel?.barrelExport, true);

    const hoistRoute = runJson('hoist-ts.mjs', ['symbol', 'HoistRoute'])?.symbol;
    eq(
        'HoistRoute imports from @xh/hoist/core (re-exported by export type *)',
        hoistRoute?.importPath,
        '@xh/hoist/core'
    );

    // Ranking is the golden sets' job (`data/symbol-search.spec.ts`). Here, only find the hit.
    const search = runJson('hoist-ts.mjs', ['search', 'GridModel']),
        gridModelHit = search?.symbols?.find((s: any) => s.name === 'GridModel');
    ok('search finds GridModel', !!gridModelHit, `symbolTotal=${search?.symbolTotal}`);
    eq('the search hit carries the barrel path', gridModelHit?.importPath, '@xh/hoist/cmp/grid');

    const members = runJson('hoist-ts.mjs', ['members', 'GridModel', '--filter', 'col']);
    ok(
        'members lists GridModel members',
        members?.members?.length > 0,
        `count=${members?.members?.length}`
    );

    //---------------------------------------------------------------------
    // hoist-docs
    //---------------------------------------------------------------------

    console.log('\nhoist-docs from the installed package:');

    const docSearch = runJson('hoist-docs.mjs', ['search', 'grid sorting']);
    ok('doc search returns results', docSearch?.resultCount > 0, `count=${docSearch?.resultCount}`);

    const outline = spawnSync(
        process.execPath,
        [join(pkgDir, 'bin', 'hoist-docs.mjs'), 'read', 'cmp/grid', '--outline'],
        {cwd: appDir, encoding: 'utf8'}
    );
    ok(
        'reads a doc outline',
        outline.status === 0 && outline.stdout.includes('Sorting'),
        `status=${outline.status} stderr=${outline.stderr}`
    );
} finally {
    rmSync(tmp, {recursive: true, force: true});
}

//---------------------------------------------------------------------
// Tally
//---------------------------------------------------------------------

console.log(`\nTotal: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
    console.log('\nFailure details:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
}
