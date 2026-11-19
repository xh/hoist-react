/**
 * Test harness for library source filtering and barrel import path resolution. Run with:
 *   npx tsx mcp/data/import-paths.spec.ts
 *
 * Self-contained, exit-coded driver (the repo has no general test framework). The tools run both
 * from a hoist-react checkout and from an app's installed `@xh/hoist`, where the package root
 * itself sits under `node_modules`. A filter that tests the absolute path passes every case in
 * the checkout and rejects every file in the app. That bug shipped twice: in the symbol indexer
 * (an empty index) and in the import path resolver (every symbol shown as a file import). So each
 * case runs at a checkout root and at installed roots, built in an in-memory ts-morph project:
 *   - `isLibrarySource`: what counts as library source, relative to the root
 *   - `createImportPathResolver`: barrel paths through `export *`, `export type *`, and named
 *     re-exports, and null for a symbol no barrel reaches
 *
 * `mcp/tools/installed-package.spec.ts` runs the real CLIs from a packed install.
 */
import {Project} from 'ts-morph';
import {createImportPathResolver} from './import-paths.js';
import {isLibrarySource} from '../util/paths.js';

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

/** Package roots to test, each in POSIX form as `resolveRepoRootPosix()` reports it. */
const ROOTS: Record<string, string> = {
    checkout: '/home/dev/hoist-react',
    'app install (npm)': '/home/dev/my-app/client-app/node_modules/@xh/hoist',
    'app install (pnpm store)':
        '/home/dev/my-app/client-app/node_modules/.pnpm/@xh+hoist@91.0.0/node_modules/@xh/hoist',
    'app under a build/ folder': '/ci/build/my-app/client-app/node_modules/@xh/hoist',
    'app under an mcp/ folder': '/srv/mcp/my-app/client-app/node_modules/@xh/hoist',
    'Windows app install': 'C:/dev/my-app/client-app/node_modules/@xh/hoist'
};

//---------------------------------------------------------------------
// isLibrarySource
//---------------------------------------------------------------------

/** Paths relative to the root, and whether each is library source. */
const SOURCE_CASES: [string, boolean][] = [
    ['core/XH.ts', true],
    ['cmp/grid/GridModel.ts', true],
    ['cmp/grid/impl/GridHScrollbar.ts', true],
    ['test-support/index.ts', true],
    ['node_modules/mobx/dist/mobx.d.ts', false],
    ['build/types/core/XH.d.ts', false],
    ['mcp/data/ts-registry.ts', false],
    ['core/XH.spec.ts', false],
    ['test-support/report/reporter.ts', false]
];

for (const [label, root] of Object.entries(ROOTS)) {
    console.log(`\nisLibrarySource - ${label}:`);
    for (const [rel, expected] of SOURCE_CASES) {
        eq(
            `${rel} is ${expected ? '' : 'not '}library source`,
            isLibrarySource(`${root}/${rel}`, root),
            expected
        );
    }
    eq(
        'a file outside the root is not library source',
        isLibrarySource('/elsewhere/core/XH.ts', root),
        false
    );
    eq(
        'a sibling folder sharing the root as a prefix is not library source',
        isLibrarySource(`${root}-old/core/XH.ts`, root),
        false
    );
}

//---------------------------------------------------------------------
// createImportPathResolver
//---------------------------------------------------------------------

/** Fixture sources, relative to the root. */
const FIXTURE: Record<string, string> = {
    'core/index.ts': "export * from './HoistBase';\nexport type * from './types/Types';\n",
    'core/HoistBase.ts': 'export class HoistBase {}\n',
    'core/types/Types.ts': 'export interface HoistRoute {name: string}\n',
    'cmp/grid/index.ts': "export * from './GridModel';\n",
    'cmp/grid/GridModel.ts': 'export class GridModel {}\n',
    'cmp/grid/impl/GridHelper.ts': 'export class GridHelper {}\n',
    'data/index.ts': "export {Store} from './Store';\n",
    'data/Store.ts': 'export class Store {}\nexport class StoreHelper {}\n',
    'utils/index.ts': "export * from './js';\n",
    'utils/js/index.ts': "export * from './LangUtils';\n",
    'utils/js/LangUtils.ts': 'export function withDefault() {}\n'
};

/** Symbol, declaring file relative to the root, and the expected barrel import path. */
const RESOLVE_CASES: [string, string, string | null][] = [
    ['HoistBase', 'core/HoistBase.ts', '@xh/hoist/core'],
    ['HoistRoute', 'core/types/Types.ts', '@xh/hoist/core'],
    ['GridModel', 'cmp/grid/GridModel.ts', '@xh/hoist/cmp/grid'],
    ['GridHelper', 'cmp/grid/impl/GridHelper.ts', null],
    ['Store', 'data/Store.ts', '@xh/hoist/data'],
    ['StoreHelper', 'data/Store.ts', null],
    ['withDefault', 'utils/js/LangUtils.ts', '@xh/hoist/utils']
];

const CASE_NOTES: Record<string, string> = {
    HoistRoute: 'through export type *',
    GridHelper: 'no barrel re-exports it',
    Store: 'through a named re-export',
    StoreHelper: 'left out of a named re-export',
    withDefault: 'through a chain of barrels, shallowest wins'
};

for (const [label, root] of Object.entries(ROOTS)) {
    console.log(`\ncreateImportPathResolver - ${label}:`);
    const project = new Project({useInMemoryFileSystem: true});
    for (const [rel, text] of Object.entries(FIXTURE)) {
        project.createSourceFile(`${root}/${rel}`, text);
    }
    const resolveImportPath = createImportPathResolver(project, root);
    for (const [name, rel, expected] of RESOLVE_CASES) {
        const note = CASE_NOTES[name] ? ` (${CASE_NOTES[name]})` : '';
        eq(
            `${name} resolves to ${expected ?? 'no barrel'}${note}`,
            resolveImportPath(`${root}/${rel}`, name),
            expected
        );
    }
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
