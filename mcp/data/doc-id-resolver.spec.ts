/**
 * Test harness for the doc ID resolver. Run with:
 *   npx tsx mcp/data/doc-id-resolver.spec.ts
 *
 * The hoist-react repo has no general test framework configured, so this script
 * is a self-contained, exit-coded driver. Loads the live registry, runs a table
 * of expectations against `resolveDocId`, prints pass/fail per case, exits with
 * 1 on any failure.
 *
 * Designed to grow as more cases are encountered. Run after every change to
 * doc-id-resolver.ts or docs/doc-registry.json.
 */
import {buildRegistry, type DocEntry} from './doc-registry.js';
import {getIndex, resolveDocId, type ResolveResult} from './doc-id-resolver.js';
import {resolveRepoRoot} from '../util/paths.js';

interface Case {
    /** Input passed to the resolver. */
    input: string;
    /** Expected canonical id, or `null` for `kind: 'unknown'`. */
    expect: string | null;
    /** Optional expected kind (defaults to 'exact' if expect matches input, 'normalized' otherwise, 'unknown' if expect is null). */
    expectKind?: ResolveResult['kind'];
    /** Optional substrings that must appear in the suggestions for `unknown` results. */
    expectSuggestionsInclude?: string[];
    /** Notes for the test report. */
    note?: string;
}

// Suppress info logs during test run; we only want test output.
process.env.HOIST_MCP_QUIET = '1';

const cases: Case[] = [
    // Tier 0: exact canonical match.
    {input: 'core/README.md', expect: 'core/README.md', note: 'Tier 0: subsystem README'},
    {input: 'cmp/grid/README.md', expect: 'cmp/grid/README.md', note: 'Tier 0: nested README'},
    {input: 'docs/authentication.md', expect: 'docs/authentication.md', note: 'Tier 0: flat doc'},
    {
        input: 'docs/upgrade-notes/v85-upgrade-notes.md',
        expect: 'docs/upgrade-notes/v85-upgrade-notes.md',
        note: 'Tier 0: upgrade notes'
    },

    // Tier 1: trivial normalization.
    {input: '  core/README.md  ', expect: 'core/README.md', note: 'Tier 1: trims whitespace'},
    {input: '/core/README.md', expect: 'core/README.md', note: 'Tier 1: leading slash stripped'},
    {input: './core/README.md', expect: 'core/README.md', note: 'Tier 1: leading ./ stripped'},
    {input: 'core//README.md', expect: 'core/README.md', note: 'Tier 1: collapses double slash'},

    // Tier 1b: case-insensitive.
    {input: 'CORE/README.md', expect: 'core/README.md', note: 'Tier 1b: uppercase id'},
    {input: 'Cmp/Grid/README.md', expect: 'cmp/grid/README.md', note: 'Tier 1b: mixed case'},

    // Tier 2 (alias index): structural auto-aliases - drop /README and .md, add
    // the docs/ prefix, or expand a vNN version code. All of these forms are
    // pre-computed into the alias map, so they resolve there before suffix completion.
    {input: 'core', expect: 'core/README.md', note: 'bare subsystem → README'},
    {input: 'cmp/grid', expect: 'cmp/grid/README.md', note: 'nested without README'},
    {input: 'core/README', expect: 'core/README.md', note: 'README without .md'},
    {input: 'authentication', expect: 'docs/authentication.md', note: 'docs/ prefix added'},
    {input: 'docs/authentication', expect: 'docs/authentication.md', note: '.md added'},
    {
        input: 'v85',
        expect: 'docs/upgrade-notes/v85-upgrade-notes.md',
        note: 'vNN shortcut'
    },
    {
        input: 'v85-upgrade-notes',
        expect: 'docs/upgrade-notes/v85-upgrade-notes.md',
        note: 'vNN-upgrade-notes shortcut'
    },

    // Tier 2 (alias index): last-segment auto-aliases.
    {input: 'grid', expect: 'cmp/grid/README.md', note: 'last-segment alias'},
    {input: 'cube', expect: 'data/cube/README.md', note: 'last-segment alias'},
    {input: 'viewmanager', expect: 'cmp/viewmanager/README.md', note: 'last-segment'},
    {input: 'dash', expect: 'desktop/cmp/dash/README.md', note: 'deep nested last segment'},
    {input: 'coding-conventions', expect: 'docs/coding-conventions.md', note: 'docs/ strip'},
    {
        input: 'persistence',
        expect: 'docs/persistence.md',
        note: 'docs/ strip'
    },

    // Ambiguity: `lifecycle` should NOT resolve - no shortening maps to a single
    // entry (lifecycle-app and lifecycle-models both exist), so it falls to suggestions.
    {
        input: 'lifecycle',
        expect: null,
        expectKind: 'unknown',
        expectSuggestionsInclude: ['lifecycle-app', 'lifecycle-models'],
        note: 'Ambiguous: lifecycle has 2 candidate docs'
    },

    // Tier 2 (alias index): explicit registry aliases, plus unambiguous last-segment
    // auto-aliases. `components`, `index`, `conventions`, `services` are declared
    // explicitly in doc-registry.json; `cmp` and `desktop` resolve via auto-alias
    // because only their own README yields that last segment (no ambiguity to override).
    {
        input: 'cmp',
        expect: 'cmp/README.md',
        expectKind: 'normalized',
        note: 'Auto-alias: only cmp/README.md yields last-segment "cmp"'
    },
    {
        input: 'components',
        expect: 'cmp/README.md',
        expectKind: 'normalized',
        note: 'Explicit alias'
    },
    {
        input: 'desktop',
        expect: 'desktop/README.md',
        expectKind: 'normalized',
        note: 'Auto-alias: last segment'
    },
    {
        input: 'index',
        expect: 'docs/README.md',
        expectKind: 'normalized',
        note: 'Explicit alias on docs index'
    },
    {
        input: 'conventions',
        expect: 'docs/coding-conventions.md',
        expectKind: 'normalized',
        note: 'Explicit alias'
    },
    {input: 'services', expect: 'svc/README.md', expectKind: 'normalized', note: 'Explicit alias'},

    // Fallback: unknown with suggestions.
    {
        input: 'frobnicate',
        expect: null,
        expectKind: 'unknown',
        note: 'Unknown with no clear suggestions'
    },
    {
        input: 'auth',
        expect: null,
        expectKind: 'unknown',
        expectSuggestionsInclude: ['authentication', 'authorization'],
        note: 'Unknown but suggests authentication and authorization'
    },

    // Edge cases.
    {input: '', expect: null, expectKind: 'unknown', note: 'Empty input'},
    {input: '   ', expect: null, expectKind: 'unknown', note: 'Whitespace-only input'}
];

//---------------------------------------------------------------------
// Runner
//---------------------------------------------------------------------

function inferExpectedKind(c: Case): ResolveResult['kind'] {
    if (c.expectKind) return c.expectKind;
    if (c.expect === null) return 'unknown';
    return c.expect === c.input.trim() ? 'exact' : 'normalized';
}

function runOne(
    registry: Parameters<typeof resolveDocId>[0],
    c: Case
): {pass: boolean; reason?: string; got?: ResolveResult} {
    const result = resolveDocId(registry, c.input);
    const expectedKind = inferExpectedKind(c);

    if (result.kind !== expectedKind) {
        return {pass: false, reason: `kind=${result.kind}, expected ${expectedKind}`, got: result};
    }

    if (result.kind === 'exact' || result.kind === 'normalized') {
        if (result.entry.id !== c.expect) {
            return {
                pass: false,
                reason: `resolved to ${result.entry.id}, expected ${c.expect}`,
                got: result
            };
        }
    }

    if (result.kind === 'unknown' && c.expectSuggestionsInclude) {
        for (const want of c.expectSuggestionsInclude) {
            if (!result.suggestions.some(s => s.includes(want))) {
                return {
                    pass: false,
                    reason: `suggestions ${JSON.stringify(result.suggestions)} missing "${want}"`,
                    got: result
                };
            }
        }
    }

    return {pass: true};
}

const {entries: registry} = buildRegistry(resolveRepoRoot());

let passed = 0;
let failed = 0;
const failures: Array<{c: Case; reason: string; got?: ResolveResult}> = [];

console.log(
    `Running ${cases.length} resolver test cases against ${registry.length}-entry registry.\n`
);

for (const c of cases) {
    const r = runOne(registry, c);
    const label = `${c.input.padEnd(36)} → ${(c.expect ?? '<unknown>').padEnd(48)}  ${c.note ?? ''}`;
    if (r.pass) {
        passed++;
        console.log(`  PASS  ${label}`);
    } else {
        failed++;
        failures.push({c, reason: r.reason!, got: r.got});
        console.log(`  FAIL  ${label}`);
        console.log(`        ${r.reason}`);
    }
}

console.log(`\nLive registry: ${passed}/${cases.length} passed, ${failed} failed.`);

// Print alias index summary for visibility.
const idx = getIndex(registry);
console.log(`Alias index size: ${idx.aliases.size} entries`);

//---------------------------------------------------------------------
// Mock-registry tests (synthetic - exercise ordering invariants that
// the live registry doesn't naturally cover).
//---------------------------------------------------------------------

function mockEntry(id: string, aliases: string[] = []): DocEntry {
    return {
        id,
        title: id,
        filePath: `/dev/null/${id}`,
        mcpCategory: 'package',
        description: '',
        keywords: [],
        aliases
    };
}

let mockPassed = 0;
let mockFailed = 0;

function check(
    label: string,
    actual: ResolveResult,
    expectedId: string | null,
    expectedKind: ResolveResult['kind']
): void {
    const actualId =
        actual.kind === 'exact' || actual.kind === 'normalized' ? actual.entry.id : null;
    if (actual.kind === expectedKind && actualId === expectedId) {
        mockPassed++;
        console.log(`  PASS  [mock] ${label}`);
    } else {
        mockFailed++;
        console.log(`  FAIL  [mock] ${label}`);
        console.log(`        expected: kind=${expectedKind}, id=${expectedId}`);
        console.log(`        got:      kind=${actual.kind}, id=${actualId}`);
    }
}

console.log('\nMock-registry cases:');

// 1. Tier 0 always wins. Even if an alias declared on entry A matches entry B's
//    canonical id, the canonical match for B takes precedence (and the alias is
//    logged as unreachable at build time).
{
    const mock = [
        mockEntry('alpha', ['beta']),
        mockEntry('beta') // canonical id "beta" exists
    ];
    check('Tier 0 wins over explicit alias collision', resolveDocId(mock, 'beta'), 'beta', 'exact');
}

// 2. Explicit alias on entry A overrides suffix completion that would otherwise
//    resolve to entry B. This validates the Tier 2 (alias) → Tier 3 (suffix)
//    ordering required by the "explicit overrides implicit" principle.
{
    const mock = [
        mockEntry('alpha/README.md', ['gamma']),
        mockEntry('docs/gamma.md') // suffix completion would reach this from input "gamma"
    ];
    check(
        'Explicit alias beats suffix completion',
        resolveDocId(mock, 'gamma'),
        'alpha/README.md',
        'normalized'
    );
}

// 3. Auto-alias ambiguity is discarded: when two entries would both auto-generate
//    the same last-segment alias, neither resolves via that shortcut.
{
    const mock = [mockEntry('a/widget/README.md'), mockEntry('b/widget/README.md')];
    // Both produce auto-alias "widget" → ambiguous → dropped.
    const r = resolveDocId(mock, 'widget');
    check('Ambiguous auto-alias drops to unknown', r, null, 'unknown');
}

// 4. Suffix completion ambiguity: if a single input has multiple registry
//    candidates among its suffix forms, no resolution.
{
    const mock = [mockEntry('thing.md'), mockEntry('thing/README.md')];
    // Input "thing" generates both candidates; both match different entries.
    const r = resolveDocId(mock, 'thing');
    check('Ambiguous suffix candidates drop to unknown', r, null, 'unknown');
}

// 5. Suffix completion resolves when the auto-alias was dropped for ambiguity
//    but exactly one structural candidate matches a real entry. Both entries
//    auto-generate the last-segment alias "widget", so it is dropped as ambiguous;
//    the suffix form "widget.md" then uniquely matches and resolves via Tier 3.
{
    const mock = [mockEntry('widget.md'), mockEntry('x/widget/README.md')];
    check(
        'Suffix completion resolves single candidate after auto-alias drop',
        resolveDocId(mock, 'widget'),
        'widget.md',
        'normalized'
    );
}

console.log(`\nMock-registry: ${mockPassed}/${mockPassed + mockFailed} passed.`);
console.log(`\nTotal: ${passed + mockPassed} passed, ${failed + mockFailed} failed.`);

if (failed > 0 || mockFailed > 0) {
    console.log('\nLive failure details:');
    for (const f of failures) {
        console.log(`  - input="${f.c.input}", note="${f.c.note}"`);
        console.log(`    expected=${JSON.stringify(f.c.expect)}, got=${JSON.stringify(f.got)}`);
    }
    process.exit(1);
}
