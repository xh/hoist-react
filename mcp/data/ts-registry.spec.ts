/**
 * Test harness for the TypeScript symbol registry's cross-platform path handling.
 * Run with:
 *   npx tsx mcp/data/ts-registry.spec.ts
 *
 * The hoist-react repo has no general test framework configured, so this script
 * is a self-contained, exit-coded driver. It guards the path normalization the
 * symbol index depends on: ts-morph's `getFilePath()` reports forward-slash paths
 * on every platform, while Node's `path` reports backslashes on Windows. The two
 * must be reconciled (to POSIX form) before comparison - a regression silently
 * filters out every source file and empties the entire symbol index on Windows.
 * See the "Path Separators (Cross-Platform)" pitfall in mcp/README.md.
 *
 * Two layers:
 *  - Synthetic path-helper cases (`toPosixPath`, `resolveRepoRootPosix`,
 *    `toRelativePath`, and the exact index-guard comparison) - these simulate a
 *    Windows path explicitly, so they are meaningful on any host OS, including
 *    Linux/macOS CI.
 *  - Live index integration - exercises `searchSymbols` / `getSymbolDetail` /
 *    `getMembers` against the real hoist-react sources to prove symbols resolve
 *    end-to-end (and that repo-relative `--file` disambiguation works).
 *
 * Run after every change to ts-registry.ts, index-cache.ts, or util/paths.ts.
 */
import {resolveRepoRoot, resolveRepoRootPosix, toPosixPath} from '../util/paths.js';
import {toRelativePath} from '../formatters/typescript.js';
import {searchSymbols, getSymbolDetail, getMembers} from './ts-registry.js';

// Suppress info logs during test run; we only want test output. (Warns still print.)
process.env.HOIST_MCP_QUIET = '1';

//---------------------------------------------------------------------
// Minimal assertion helpers (match the exit-coded style of the sibling
// doc-id-resolver.spec.ts).
//---------------------------------------------------------------------

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
// Synthetic path-helper cases (host-OS-independent).
//---------------------------------------------------------------------

console.log('toPosixPath cases:');
eq(
    'converts backslashes',
    toPosixPath('D:\\hoist-react\\core\\XH.ts'),
    'D:/hoist-react/core/XH.ts'
);
eq('leaves forward slashes untouched', toPosixPath('/repo/core/XH.ts'), '/repo/core/XH.ts');
eq('normalizes mixed separators', toPosixPath('a\\b/c\\d'), 'a/b/c/d');
eq('is idempotent', toPosixPath(toPosixPath('D:\\a\\b')), 'D:/a/b');

console.log('\nresolveRepoRootPosix cases:');
const rootPosix = resolveRepoRootPosix();
ok('has no backslashes', !rootPosix.includes('\\'), `got "${rootPosix}"`);
eq('equals toPosixPath(resolveRepoRoot())', rootPosix, toPosixPath(resolveRepoRoot()));

console.log('\nIndex-guard regression cases (simulated Windows paths):');
// The exact scenario that broke: on Windows, resolveRepoRoot() yields a
// backslash path while ts-morph yields forward slashes. Assert the naive guard
// fails and the POSIX-normalized guard succeeds - regardless of the host OS.
const winRootNative = 'D:\\hoist-react'; // what resolveRepoRoot() returns on Windows
const winFile = 'D:/hoist-react/cmp/grid/GridModel.ts'; // what ts-morph getFilePath() returns on Windows
ok(
    'naive backslash-root comparison fails (the original bug)',
    !winFile.startsWith(winRootNative + '/')
);
ok(
    'posix-normalized root comparison succeeds (the fix)',
    winFile.startsWith(toPosixPath(winRootNative) + '/')
);
eq(
    'relative slice under posix root is correct',
    winFile.slice(toPosixPath(winRootNative).length + 1),
    'cmp/grid/GridModel.ts'
);

console.log('\ntoRelativePath cases:');
const sampleRel = 'cmp/grid/GridModel.ts';
eq('strips a posix absolute path', toRelativePath(`${rootPosix}/${sampleRel}`), sampleRel);
// A backslash absolute path (same root) must still strip AND normalize to posix.
const backslashAbs = `${rootPosix.replace(/\//g, '\\')}\\cmp\\grid\\GridModel.ts`;
eq('strips + normalizes a backslash absolute path', toRelativePath(backslashAbs), sampleRel);

//---------------------------------------------------------------------
// Live index integration (needs the real hoist-react sources; builds or
// loads the cached index on first query).
//---------------------------------------------------------------------

console.log('\nLive index cases:');

const results = await searchSymbols('GridModel', {limit: 5});
const gm = results.find(r => r.name === 'GridModel' && r.kind === 'class');
ok('searchSymbols("GridModel") finds the class', !!gm, `got ${results.length} results`);
if (gm) {
    eq('GridModel resolves to cmp/grid/GridModel.ts', toRelativePath(gm.filePath), sampleRel);
    eq('GridModel sourcePackage is cmp/grid', gm.sourcePackage, 'cmp/grid');
}

const detail = await getSymbolDetail('GridModel');
ok(
    'getSymbolDetail("GridModel") resolves',
    !!detail && detail.kind === 'class',
    `got ${JSON.stringify(detail && {name: detail.name, kind: detail.kind})}`
);

const members = await getMembers('GridModel');
ok(
    'getMembers("GridModel") returns members',
    !!members && members.members.length > 0,
    `count=${members?.members.length ?? 0}`
);

// --file disambiguation (the secondary Windows bug): a repo-relative path passed
// to findIndexEntry must resolve to the matching entry. `View` exists in both
// cmp/viewmanager and data/cube; the path selects the data/cube one.
const view = await getSymbolDetail('View', 'data/cube/View.ts');
ok(
    'getSymbolDetail("View", "data/cube/View.ts") disambiguates by repo-relative path',
    !!view && toRelativePath(view.filePath) === 'data/cube/View.ts',
    `relPath=${view ? toRelativePath(view.filePath) : 'null'}`
);

//---------------------------------------------------------------------
// Tally
//---------------------------------------------------------------------

console.log(`\nTotal: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
    console.log('\nFailure details:');
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
}
