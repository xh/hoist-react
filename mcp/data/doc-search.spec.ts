/**
 * Golden-set retrieval eval for doc search. Run with:
 *   npx tsx mcp/data/doc-search.spec.ts
 *
 * Self-contained, exit-coded driver (the repo has no general test framework). Runs each golden
 * query through `searchDocs` against the live registry and counts a hit when any of the top 3
 * results is one of the expected sections. Asserts:
 *   - top-3 hit rate at or above {@link MIN_HIT_RATE}
 *   - each named experiment query returns its sections in a default (5-result) search
 *   - a default search renders under {@link MAX_SEARCH_TOKENS} tokens for every golden query
 *
 * Prints a miss table for tuning. Set `VERBOSE=1` to print the top 3 for every query.
 *
 * Expectations name a doc id and, optionally, a section path prefix (headings below the doc
 * title, e.g. `Messages > XH.confirm`). Matching ignores case and punctuation. Keep queries
 * realistic: the two-to-five keyword style an agent would send, plus a few natural-language
 * phrasings.
 */
import {buildRegistry} from './doc-registry.js';
import {DEFAULT_SEARCH_LIMIT, searchDocs, type DocSearchResult} from './doc-search.js';
import {estimateTokens} from './doc-sections.js';
import {formatSearchResults, searchReadHint} from '../formatters/docs.js';
import {resolveRepoRoot} from '../util/paths.js';

process.env.HOIST_MCP_QUIET = '1';

const MIN_HIT_RATE = 0.85,
    MAX_SEARCH_TOKENS = 800;

interface Target {
    doc: string;
    section?: string;
}

interface GoldenCase {
    query: string;
    /** Any one of these in the top 3 counts as a hit. */
    expect: Target[];
    /** Where the case came from - experiment task, docs/README.md quick reference, or topic. */
    source: 'experiment' | 'quick-ref' | 'topic';
}

const T = (doc: string, section?: string): Target => ({doc, section});

const cases: GoldenCase[] = [
    // Experiment tasks: grid columns with renderers; confirm + fetch + mask + toast;
    // persisted grid + panel; validated form.
    {
        query: 'mask panel during async call',
        expect: [
            T('desktop/cmp/panel/README.md', 'Mask'),
            T('promise/README.md', 'Promise Prototype Extensions > UI Masking')
        ],
        source: 'experiment'
    },
    {
        query: 'form field required validation custom message',
        expect: [
            T('cmp/form/README.md', 'FieldModel > Validation Rules'),
            T('data/README.md', 'Validation System > Custom Constraints')
        ],
        source: 'experiment'
    },
    {
        query: 'lazy load tabs route',
        expect: [
            T('docs/routing.md', 'TabContainerModel Route Integration'),
            T('cmp/tab/README.md', 'TabContainerModel > Routing'),
            T('cmp/tab/README.md', 'TabContainerModel > Render Modes')
        ],
        source: 'experiment'
    },
    {
        query: 'how to show a confirmation dialog',
        expect: [T('appcontainer/README.md', 'Messages > XH.confirm')],
        source: 'experiment'
    },
    {
        query: 'grid column custom renderer',
        expect: [
            T('cmp/grid/README.md', 'Common Usage Patterns > Custom Renderers'),
            T('format/README.md', 'Formatters vs Renderers > Renderer Factories')
        ],
        source: 'experiment'
    },
    {
        query: 'number format renderer column',
        expect: [
            T('format/README.md', 'Formatters vs Renderers > Renderer Factories'),
            T('format/README.md', 'Common Patterns > Defining Reusable Column Specs')
        ],
        source: 'experiment'
    },
    {
        query: 'column spec properties width headerName',
        expect: [T('cmp/grid/README.md', 'Column Properties Reference')],
        source: 'experiment'
    },
    {
        query: 'fetchJson post body',
        expect: [
            T('svc/README.md', 'Built-in Services > Core Data Access'),
            T('svc/README.md', 'Common Pitfalls > params Triggers a POST')
        ],
        source: 'experiment'
    },
    {
        query: 'toast message',
        expect: [T('appcontainer/README.md', 'Toasts')],
        source: 'experiment'
    },
    {
        query: 'deleteSelectedAsync grid selected record',
        expect: [T('cmp/grid/README.md', 'Common Usage Patterns > Selection')],
        source: 'experiment'
    },
    {
        query: 'persist grid column state',
        expect: [T('docs/persistence.md', 'Built-in Model Support > GridModel')],
        source: 'experiment'
    },
    {
        query: 'persistWith',
        expect: [
            T('docs/persistence.md', 'Using Persistence > Approach 3'),
            T('docs/persistence.md', 'Common Pitfalls > Missing persistWith')
        ],
        source: 'experiment'
    },
    {
        query: 'panel collapse resize persist',
        expect: [
            T('docs/persistence.md', 'Common Patterns > Panel Collapse'),
            T('docs/persistence.md', 'Built-in Model Support > PanelModel'),
            T('desktop/cmp/panel/README.md', 'Persistence')
        ],
        source: 'experiment'
    },
    {
        query: 'create FormModel fields',
        expect: [T('cmp/form/README.md', 'FormModel > Creating a FormModel')],
        source: 'experiment'
    },
    {
        query: 'validate form before save',
        expect: [T('cmp/form/README.md', 'FormModel > Validation')],
        source: 'experiment'
    },

    // Rows of the "Quick Reference by Task" table in docs/README.md.
    {query: 'component model service pattern', expect: [T('core/README.md')], source: 'quick-ref'},
    {query: 'XH singleton API', expect: [T('core/README.md', 'XH Singleton')], source: 'quick-ref'},
    {query: 'configure data grid', expect: [T('cmp/grid/README.md')], source: 'quick-ref'},
    {
        query: 'input change commit lifecycle',
        expect: [T('cmp/input/README.md')],
        source: 'quick-ref'
    },
    {query: 'tabbed interface', expect: [T('cmp/tab/README.md')], source: 'quick-ref'},
    {
        query: 'configurable dashboard',
        expect: [T('desktop/cmp/dash/README.md')],
        source: 'quick-ref'
    },
    {
        query: 'panel toolbar',
        expect: [
            T('desktop/cmp/panel/README.md', 'Toolbars'),
            T('desktop/README.md', 'Component Sub-Packages > Toolbar')
        ],
        source: 'quick-ref'
    },
    {query: 'mobile app navigator', expect: [T('mobile/README.md')], source: 'quick-ref'},
    {
        query: 'save and restore named views',
        expect: [T('cmp/viewmanager/README.md')],
        source: 'quick-ref'
    },
    {
        query: 'date range presets',
        expect: [T('cmp/daterange/README.md', 'DateRangePickerModel > Presets')],
        source: 'quick-ref'
    },
    {
        query: 'layout containers hbox vbox',
        expect: [T('cmp/layout/README.md', 'Core Components > VBox')],
        source: 'quick-ref'
    },
    {query: 'store records fields', expect: [T('data/README.md')], source: 'quick-ref'},
    {
        query: 'cube aggregation views queries',
        expect: [T('data/cube/README.md')],
        source: 'quick-ref'
    },
    {query: 'ConfigService PrefService', expect: [T('svc/README.md')], source: 'quick-ref'},
    {query: 'tracing metrics', expect: [T('docs/telemetry.md')], source: 'quick-ref'},
    {
        query: 'format dates',
        expect: [T('format/README.md', 'Date Formatting')],
        source: 'quick-ref'
    },
    {
        query: 'localization locale',
        expect: [T('format/README.md', 'Localization')],
        source: 'quick-ref'
    },
    {query: 'app startup sequence', expect: [T('docs/lifecycle-app.md')], source: 'quick-ref'},
    {
        query: 'model lifecycle loading',
        expect: [T('docs/lifecycle-models-and-services.md')],
        source: 'quick-ref'
    },
    {
        query: 'OAuth login authentication',
        expect: [T('docs/authentication.md'), T('security/README.md')],
        source: 'quick-ref'
    },
    {query: 'check roles gates access', expect: [T('docs/authorization.md')], source: 'quick-ref'},
    {query: 'client-side routing', expect: [T('docs/routing.md')], source: 'quick-ref'},
    {
        query: 'handle exceptions error dialog',
        expect: [T('docs/error-handling.md'), T('appcontainer/README.md', 'Exception Handling')],
        source: 'quick-ref'
    },
    {
        query: 'testId selectors test automation',
        expect: [T('docs/test-automation.md')],
        source: 'quick-ref'
    },
    {
        query: 'promise error handling tracking',
        expect: [T('promise/README.md')],
        source: 'quick-ref'
    },
    {query: 'bindable observable', expect: [T('mobx/README.md')], source: 'quick-ref'},
    {
        query: 'timer decorators LocalDate hooks',
        expect: [T('utils/README.md')],
        source: 'quick-ref'
    },
    {
        query: 'theming app shell',
        expect: [T('appcontainer/README.md', 'Theme'), T('styles/README.md')],
        source: 'quick-ref'
    },
    {query: 'icons in buttons', expect: [T('icon/README.md')], source: 'quick-ref'},
    {
        query: 'customize spinner',
        expect: [T('icon/README.md', 'Usage Patterns > Spinner Component')],
        source: 'quick-ref'
    },
    {
        query: 'Auth0 MSAL client',
        expect: [T('security/README.md'), T('docs/authentication.md', 'OAuth Clients')],
        source: 'quick-ref'
    },
    {query: 'detect memory leaks', expect: [T('inspector/README.md')], source: 'quick-ref'},
    {query: 'third-party library kit', expect: [T('kit/README.md')], source: 'quick-ref'},
    {
        query: 'deploy docker nginx',
        expect: [T('docs/build-and-deploy-app.md')],
        source: 'quick-ref'
    },
    {
        query: 'local development environment setup',
        expect: [T('docs/development-environment.md')],
        source: 'quick-ref'
    },
    {query: 'MCP tools AI assistants', expect: [T('mcp/README.md')], source: 'quick-ref'},
    {query: 'customize colors fonts theme', expect: [T('styles/README.md')], source: 'quick-ref'},
    {query: 'coding conventions', expect: [T('docs/coding-conventions.md')], source: 'quick-ref'},
    {
        query: 'hoist-core version compatibility',
        expect: [T('docs/version-compatibility.md')],
        source: 'quick-ref'
    },

    // Topic lookups: specific APIs and patterns.
    {
        query: 'tab render mode lazy',
        expect: [T('cmp/tab/README.md', 'TabContainerModel > Render Modes')],
        source: 'topic'
    },
    {
        query: 'catchDefault',
        expect: [
            T('promise/README.md', 'Promise Prototype Extensions > Error Handling'),
            T('docs/error-handling.md', 'Promise.catchDefault()')
        ],
        source: 'topic'
    },
    {
        query: 'handleException options',
        expect: [
            T('docs/error-handling.md', 'XH.handleException()'),
            T('appcontainer/README.md', 'Exception Handling')
        ],
        source: 'topic'
    },
    {
        query: 'store loadData',
        expect: [T('data/README.md', 'Store > Data Loading')],
        source: 'topic'
    },
    {
        query: 'tree data children',
        expect: [
            T('data/README.md', 'Tree Data'),
            T('cmp/grid/README.md', 'Common Usage Patterns > Tree Mode')
        ],
        source: 'topic'
    },
    {
        query: 'custom cube aggregator',
        expect: [T('data/cube/README.md', 'Custom Aggregators')],
        source: 'topic'
    },
    {
        query: 'DashContainer viewSpecs',
        expect: [T('desktop/cmp/dash/README.md', 'DashContainer')],
        source: 'topic'
    },
    {
        query: 'view manager auto save',
        expect: [T('cmp/viewmanager/README.md', 'ViewManagerModel > Auto-Save')],
        source: 'topic'
    },
    {
        query: 'Timer create interval',
        expect: [T('utils/README.md', 'Async Utilities > Timer')],
        source: 'topic'
    },
    {
        query: 'fmtNumber precision',
        expect: [T('format/README.md', 'Number Formatting')],
        source: 'topic'
    },
    {
        query: 'loadSpec isStale',
        expect: [
            T(
                'docs/lifecycle-models-and-services.md',
                'LoadSupport Deep Dive > Staleness Checking'
            ),
            T(
                'docs/error-handling.md',
                'Error Handling in doLoadAsync > Why Check loadSpec.isStale'
            )
        ],
        source: 'topic'
    },
    {
        query: 'authoring container component children items',
        expect: [T('core/README.md', 'Element Factories > Authoring a Container Component')],
        source: 'topic'
    },
    {
        query: 'creates vs uses',
        expect: [T('core/README.md', 'Components and hoistCmp > Model Specs')],
        source: 'topic'
    },
    {
        query: 'websocket subscription',
        expect: [
            T('svc/README.md', 'Common Patterns > WebSocket Subscriptions'),
            T('svc/README.md', 'Built-in Services > Communication')
        ],
        source: 'topic'
    },
    {query: 'dark theme', expect: [T('styles/README.md', 'Dark Theme')], source: 'topic'},
    {
        query: 'BEM css class naming',
        expect: [
            T('styles/README.md', 'BEM Class Naming'),
            T('docs/coding-conventions.md', 'CSS Class Naming')
        ],
        source: 'topic'
    },
    {
        query: 'grid context menu',
        expect: [T('cmp/grid/README.md', 'Common Usage Patterns > Context Menus')],
        source: 'topic'
    },
    {
        query: 'grid export excel',
        expect: [T('cmp/grid/README.md', 'Common Usage Patterns > Export')],
        source: 'topic'
    },
    {
        query: 'grid inline editing',
        expect: [T('cmp/grid/README.md', 'Common Usage Patterns > Inline Editing')],
        source: 'topic'
    },
    {
        query: 'impersonation',
        expect: [
            T('appcontainer/README.md', 'Impersonation'),
            T('docs/authentication.md', 'Identity and Access Control > Impersonation')
        ],
        source: 'topic'
    },
    {
        query: 'navigate routerState',
        expect: [T('docs/routing.md', 'XH Routing API')],
        source: 'topic'
    },
    {query: 'changelog entry format', expect: [T('docs/changelog-format.md')], source: 'topic'},
    {
        query: 'managed decorator destroy',
        expect: [
            T('docs/lifecycle-models-and-services.md', 'HoistModel Lifecycle > Destruction'),
            T('core/README.md', 'HoistBase')
        ],
        source: 'topic'
    }
];

//------------------------------------------------------------------
// Runner
//------------------------------------------------------------------

const {entries: registry} = buildRegistry(resolveRepoRoot());

function norm(s: string): string {
    return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function matches(result: DocSearchResult, target: Target): boolean {
    if (result.entry.id !== target.doc) return false;
    return target.section == null || norm(result.section.ref).startsWith(norm(target.section));
}

function label(r: DocSearchResult): string {
    return `${r.entry.id} > ${r.section.ref}`;
}

let failures = 0,
    hits = 0,
    maxTokens = 0,
    maxTokensQuery = '';
const misses: string[] = [];

for (const c of cases) {
    const results = searchDocs(registry, c.query),
        top3 = results.slice(0, 3),
        hit = top3.some(r => c.expect.some(t => matches(r, t))),
        tokens = estimateTokens(
            `${formatSearchResults(results, c.query)}\n\n${searchReadHint('mcp')}`
        );

    if (tokens > maxTokens) {
        maxTokens = tokens;
        maxTokensQuery = c.query;
    }
    if (hit) hits++;
    else {
        misses.push(
            [
                `  "${c.query}" (${c.source})`,
                `      expected: ${c.expect.map(t => (t.section ? `${t.doc} > ${t.section}` : t.doc)).join(' | ')}`,
                ...top3.map((r, i) => `      ${i + 1}. ${label(r)}`)
            ].join('\n')
        );
    }
    if (process.env.VERBOSE) {
        console.log(`${hit ? 'HIT ' : 'MISS'} "${c.query}"`);
        top3.forEach((r, i) => console.log(`       ${i + 1}. ${label(r)} (${r.score.toFixed(1)})`));
    }
}

const hitRate = hits / cases.length;
console.log(`Golden set: ${hits}/${cases.length} top-3 hits (${(hitRate * 100).toFixed(1)}%)`);
if (misses.length) console.log(`Misses:\n${misses.join('\n')}`);

if (hitRate < MIN_HIT_RATE) {
    console.log(`  FAIL  top-3 hit rate below ${MIN_HIT_RATE * 100}%`);
    failures++;
} else {
    console.log(`  PASS  top-3 hit rate at or above ${MIN_HIT_RATE * 100}%`);
}

// Token budget: every golden query's default result text must stay within budget.
if (maxTokens >= MAX_SEARCH_TOKENS) {
    console.log(
        `  FAIL  default search ~${maxTokens} tokens for "${maxTokensQuery}" (max ${MAX_SEARCH_TOKENS})`
    );
    failures++;
} else {
    console.log(`  PASS  largest default search ~${maxTokens} tokens ("${maxTokensQuery}")`);
}

// Experiment queries named in the design issue must return these sections in a default search.
const named: Array<{query: string; expect: Target[]}> = [
    {
        query: 'mask panel during async call',
        expect: [
            T('desktop/cmp/panel/README.md', 'Mask'),
            T('promise/README.md', 'Promise Prototype Extensions > UI Masking')
        ]
    },
    {
        query: 'form field required validation custom message',
        expect: [
            T('cmp/form/README.md', 'FieldModel > Validation Rules'),
            T('data/README.md', 'Validation System > Custom Constraints')
        ]
    },
    {
        query: 'lazy load tabs route',
        expect: [T('docs/routing.md', 'TabContainerModel Route Integration')]
    },
    {
        query: 'how to show a confirmation dialog',
        expect: [T('appcontainer/README.md', 'Messages > XH.confirm')]
    }
];

for (const n of named) {
    const results = searchDocs(registry, n.query),
        ranks = n.expect.map(t => results.findIndex(r => matches(r, t)) + 1);
    if (ranks.includes(0)) {
        console.log(
            `  FAIL  "${n.query}" lacks a named section in its ${DEFAULT_SEARCH_LIMIT} results`
        );
        results.forEach((r, i) => console.log(`          ${i + 1}. ${label(r)}`));
        failures++;
    } else {
        console.log(`  PASS  "${n.query}" returns the named sections at rank ${ranks.join(', ')}`);
    }
}

// Structural checks.
const capped = searchDocs(registry, 'grid', {limit: 10}),
    perDoc = new Map<string, number>();
capped.forEach(r => perDoc.set(r.entry.id, (perDoc.get(r.entry.id) ?? 0) + 1));
if ([...perDoc.values()].some(n => n > 2)) {
    console.log('  FAIL  more than 2 sections from one doc');
    failures++;
} else {
    console.log('  PASS  at most 2 sections per doc');
}

const conceptOnly = searchDocs(registry, 'grid', {category: 'concept'});
if (conceptOnly.length === 0 || conceptOnly.some(r => r.entry.mcpCategory !== 'concept')) {
    console.log('  FAIL  category filter');
    failures++;
} else {
    console.log('  PASS  category filter');
}

if (searchDocs(registry, 'how to the').length !== 0) {
    console.log('  FAIL  stop-word-only query should return nothing');
    failures++;
} else {
    console.log('  PASS  stop-word-only query returns nothing');
}

console.log(`\nTotal: ${failures === 0 ? 'all checks passed' : `${failures} failed`}.`);
process.exit(failures === 0 ? 0 : 1);
