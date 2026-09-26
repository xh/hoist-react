/**
 * Golden-set retrieval eval for symbol search, plus the acceptance checks for the v2 symbol
 * tools. Run with:
 *   npx tsx mcp/data/symbol-search.spec.ts
 *
 * Self-contained, exit-coded driver (the repo has no general test framework). Runs each golden
 * query through `searchSymbols` and counts a hit when any of the top 3 symbol hits or top 3
 * member hits is one of the expected targets. Asserts:
 *   - top-3 hit rate at or above {@link MIN_HIT_RATE}
 *   - the three formerly zero-result queries return their obvious hit in the top 3
 *   - a default search renders under {@link MAX_SEARCH_TOKENS} tokens for every golden query,
 *     and under {@link MAX_EXPERIMENT_TOKENS} for the experiment queries named in the issue
 *   - the tool-level acceptance cases: import path and member summary on `ColumnSpec`,
 *     `onClick` under external members of `ButtonProps`, an explained error for `FieldType`,
 *     `ColumnSpec.headerName` with its JSDoc, `GridModel` filtered by `col` under 1k tokens
 *
 * Prints a miss table for tuning. Set `VERBOSE=1` to print the top 3 for every query.
 *
 * Expectations name a symbol (`GridModel`, matching the hit, its folded factory, or its folded
 * Props interface) or an `Owner.member` (`*.member` accepts any owner, for members that many
 * configs share). Keep queries realistic: the one-to-four keyword style an agent sends,
 * including the API names it half-remembers.
 */
import {estimateTokens} from './doc-sections.js';
import {searchSymbols, type SymbolSearchResults} from './symbol-search.js';
import {
    describeMembers,
    describeSymbol,
    formatSymbolSearch,
    searchNextHint
} from '../formatters/typescript.js';

process.env.HOIST_MCP_QUIET = '1';

const MIN_HIT_RATE = 0.85,
    MAX_SEARCH_TOKENS = 800,
    MAX_EXPERIMENT_TOKENS = 600,
    MAX_FILTERED_MEMBERS_TOKENS = 1000;

interface GoldenCase {
    query: string;
    /** Any one of these in the top 3 symbols or top 3 members counts as a hit. */
    expect: string[];
    /** Where the case came from - experiment trail, formerly zero-result query, or common API. */
    source: 'experiment' | 'zero-result' | 'common';
}

const cases: GoldenCase[] = [
    // Experiment task: grid with custom column renderers.
    {query: 'GridModel', expect: ['GridModel'], source: 'experiment'},
    {
        query: 'column renderer',
        expect: ['ColumnRenderer', 'Column.renderer', 'ColumnSpec.renderer'],
        source: 'experiment'
    },
    {query: 'headerName', expect: ['ColumnSpec.headerName'], source: 'experiment'},
    {query: 'checkboxRenderer', expect: ['checkboxRenderer'], source: 'experiment'},
    {query: 'number renderer', expect: ['numberRenderer', 'fmtNumber'], source: 'experiment'},
    {query: 'dateRenderer', expect: ['dateRenderer'], source: 'experiment'},
    {
        query: 'column width flex',
        expect: ['ColumnSpec.width', 'ColumnSpec.flex', 'Column.flex', 'Column.width'],
        source: 'experiment'
    },
    {
        query: 'grid columns',
        expect: ['GridConfig.columns', 'GridModel.columns'],
        source: 'experiment'
    },
    {query: 'store fields', expect: ['StoreConfig.fields', 'Store.fields'], source: 'experiment'},
    {
        query: 'selected record',
        expect: ['GridModel.selectedRecord', 'StoreSelectionModel.selectedRecord'],
        source: 'experiment'
    },
    {
        query: 'groupSortFn',
        expect: ['GridConfig.groupSortFn', 'GridModel.groupSortFn'],
        source: 'experiment'
    },

    // Experiment task: confirm, fetch, mask, toast.
    {query: 'confirm', expect: ['XHApi.confirm'], source: 'experiment'},
    {query: 'XH confirm dialog', expect: ['XHApi.confirm', 'MessageSpec'], source: 'experiment'},
    {query: 'toast', expect: ['XHApi.toast', 'ToastSpec'], source: 'experiment'},
    {
        query: 'fetchJson',
        expect: ['FetchService.fetchJson', 'XHApi.fetchJson'],
        source: 'experiment'
    },
    {
        query: 'fetch params post',
        expect: ['FetchOptions.params', 'FetchOptions.method', 'FetchOptions'],
        source: 'experiment'
    },
    {
        query: 'fetchJson options',
        expect: ['FetchOptions', 'FetchService.fetchJson'],
        source: 'experiment'
    },
    {query: 'mask', expect: ['Mask', 'mask', 'MaskProps'], source: 'experiment'},
    {
        query: 'panel mask loading',
        expect: ['PanelProps.mask', 'Mask', 'Panel'],
        source: 'experiment'
    },
    {
        query: 'loading',
        expect: ['LoadSupport', 'LoadSpec', 'LoadSupport.loadAsync'],
        source: 'experiment'
    },
    {query: 'catchDefault', expect: ['catchDefault', 'Promise.catchDefault'], source: 'experiment'},
    {
        query: 'handleException',
        expect: ['XHApi.handleException', 'ExceptionHandler'],
        source: 'experiment'
    },
    {query: 'linkTo', expect: ['linkTo', 'Promise.linkTo'], source: 'experiment'},
    {query: 'TaskObserver', expect: ['TaskObserver'], source: 'experiment'},

    // Experiment task: persisted grid and panel.
    {query: 'persistWith', expect: ['*.persistWith', 'PersistOptions'], source: 'experiment'},
    {query: 'PanelModel', expect: ['PanelModel'], source: 'experiment'},
    {
        query: 'panel collapsible side',
        expect: ['PanelConfig.side', 'PanelConfig.collapsible', 'PanelModel'],
        source: 'experiment'
    },
    {
        query: 'panel modal',
        expect: ['ModalSupportModel', 'PanelConfig.modalSupport', 'PanelModel.isModal'],
        source: 'experiment'
    },
    {
        query: 'grid persist columns',
        expect: ['GridModelPersistOptions', 'GridConfig.persistWith'],
        source: 'experiment'
    },
    {query: 'PersistOptions', expect: ['PersistOptions'], source: 'experiment'},
    {
        query: 'local storage persistence provider',
        expect: ['LocalStorageProvider', 'PersistenceProvider'],
        source: 'experiment'
    },

    // Experiment task: validated form.
    {query: 'FormModel', expect: ['FormModel'], source: 'experiment'},
    {query: 'required', expect: ['required'], source: 'experiment'},
    {
        query: 'field rules validation',
        expect: ['FieldModel.rules', 'FieldConfig.rules', 'Rule', 'BaseFieldModel.rules'],
        source: 'experiment'
    },
    {
        query: 'validate form',
        expect: ['FormModel.validateAsync', 'FormModel.isValid', 'FormModel'],
        source: 'experiment'
    },
    {query: 'lengthIs', expect: ['lengthIs'], source: 'experiment'},
    {query: 'textInput', expect: ['TextInput', 'textInput'], source: 'experiment'},
    {
        query: 'select input options',
        expect: ['Select', 'select', 'SelectProps.options'],
        source: 'experiment'
    },
    {query: 'dateInput', expect: ['DateInput', 'dateInput'], source: 'experiment'},
    {
        query: 'formField label',
        expect: ['FormFieldProps.label', 'FormField', 'formField'],
        source: 'experiment'
    },
    {query: 'numberInput', expect: ['NumberInput', 'numberInput'], source: 'experiment'},

    // Formerly zero-result queries (AND matching over name + JSDoc + member names).
    {query: 'PanelModel persistWith collapsed', expect: ['PanelModel'], source: 'zero-result'},
    {
        query: 'required validator rule constraint',
        expect: ['required', 'Rule', 'Constraint'],
        source: 'zero-result'
    },
    {
        query: 'toolbar onClick button',
        expect: ['Toolbar', 'toolbar', 'Button', 'button', 'ButtonProps.onClick'],
        source: 'zero-result'
    },

    // Most-used classes, configs, and components.
    {query: 'Store', expect: ['Store'], source: 'common'},
    {query: 'StoreRecord raw', expect: ['StoreRecord.raw'], source: 'common'},
    {query: 'HoistModel', expect: ['HoistModel'], source: 'common'},
    {query: 'hoistCmp', expect: ['hoistCmp'], source: 'common'},
    {query: 'XH', expect: ['XH', 'XHApi'], source: 'common'},
    {query: 'TabContainerModel', expect: ['TabContainerModel'], source: 'common'},
    {
        query: 'tab route',
        expect: ['TabContainerConfig.route', 'TabConfig.route', 'TabContainerModel.route'],
        source: 'common'
    },
    {query: 'LocalDate', expect: ['LocalDate'], source: 'common'},
    {query: 'fmtDate', expect: ['fmtDate'], source: 'common'},
    {query: 'Icon', expect: ['Icon'], source: 'common'},
    {query: 'button', expect: ['Button', 'button'], source: 'common'},
    {query: 'panel', expect: ['Panel', 'panel'], source: 'common'},
    {query: 'hbox vbox', expect: ['hbox', 'vbox', 'HBox', 'VBox'], source: 'common'},
    {query: 'managed', expect: ['managed'], source: 'common'},
    {query: 'bindable', expect: ['bindable'], source: 'common'},
    {query: 'Cube', expect: ['Cube'], source: 'common'},
    {query: 'DashContainerModel', expect: ['DashContainerModel'], source: 'common'},
    {query: 'useLocalModel', expect: ['useLocalModel'], source: 'common'},
    {query: 'creates uses', expect: ['creates', 'uses'], source: 'common'},
    {query: 'RecordAction', expect: ['RecordAction', 'RecordActionSpec'], source: 'common'},
    {query: 'sortBy', expect: ['*.sortBy'], source: 'common'},
    {query: 'emptyText', expect: ['GridConfig.emptyText', 'GridModel.emptyText'], source: 'common'},
    {query: 'treeMode', expect: ['GridConfig.treeMode', 'GridModel.treeMode'], source: 'common'},
    {query: 'selModel', expect: ['GridConfig.selModel', 'GridModel.selModel'], source: 'common'},
    {query: 'ViewManagerModel', expect: ['ViewManagerModel'], source: 'common'},
    {
        query: 'doLoadAsync',
        expect: ['LoadSupport.doLoadAsync', 'HoistModel.doLoadAsync', 'Loadable.doLoadAsync'],
        source: 'common'
    },
    {query: 'addReaction', expect: ['HoistBase.addReaction'], source: 'common'}
];

/** The issue's experiment queries, measured against the tighter budget. */
const EXPERIMENT_QUERIES = [
    'column renderer',
    'PanelModel persistWith collapsed',
    'required validator rule constraint',
    'toolbar onClick button',
    'select input options',
    'headerName',
    'confirm'
];

//------------------------------------------------------------------
// Runner
//------------------------------------------------------------------

function symbolNames(r: SymbolSearchResults): string[] {
    return r.symbols
        .slice(0, 3)
        .flatMap(h => [h.entry.name, h.factory, h.props])
        .filter(Boolean) as string[];
}

function memberNames(r: SymbolSearchResults): string[] {
    return r.members.slice(0, 3).map(h => `${h.entry.ownerName}.${h.entry.name}`);
}

function isHit(r: SymbolSearchResults, expect: string[]): boolean {
    const names = new Set([...symbolNames(r), ...memberNames(r)]);
    return expect.some(e =>
        e.startsWith('*.') ? [...names].some(n => n.endsWith(e.slice(1))) : names.has(e)
    );
}

function label(r: SymbolSearchResults): string {
    const s = r.symbols.slice(0, 3).map(h => `${h.entry.name}${h.props ? `+${h.props}` : ''}`),
        m = memberNames(r);
    return `symbols: ${s.join(', ') || '-'} | members: ${m.join(', ') || '-'}`;
}

function searchText(r: SymbolSearchResults): string {
    const hasResults = r.symbols.length > 0 || r.members.length > 0;
    return `${formatSymbolSearch(r, 'concise')}\n\n${searchNextHint('mcp', hasResults)}`;
}

let failures = 0,
    hits = 0,
    maxTokens = 0,
    maxTokensQuery = '';
const misses: string[] = [],
    tokensByQuery = new Map<string, number>();

for (const c of cases) {
    const results = await searchSymbols(c.query),
        hit = isHit(results, c.expect),
        tokens = estimateTokens(searchText(results));
    tokensByQuery.set(c.query, tokens);
    if (tokens > maxTokens) {
        maxTokens = tokens;
        maxTokensQuery = c.query;
    }
    if (hit) hits++;
    else {
        misses.push(
            [
                `  "${c.query}" (${c.source})`,
                `      expected: ${c.expect.join(' | ')}`,
                `      got: ${label(results)}`
            ].join('\n')
        );
    }
    if (process.env.VERBOSE)
        console.log(`${hit ? 'HIT ' : 'MISS'} "${c.query}" -> ${label(results)}`);
}

const hitRate = hits / cases.length;
console.log(`Golden set: ${hits}/${cases.length} top-3 hits (${(hitRate * 100).toFixed(1)}%)`);
if (misses.length) console.log(`Misses:\n${misses.join('\n')}`);

function pass(name: string) {
    console.log(`  PASS  ${name}`);
}
function fail(name: string) {
    console.log(`  FAIL  ${name}`);
    failures++;
}

if (hitRate < MIN_HIT_RATE) fail(`top-3 hit rate below ${MIN_HIT_RATE * 100}%`);
else pass(`top-3 hit rate at or above ${MIN_HIT_RATE * 100}%`);

// Token budgets.
if (maxTokens >= MAX_SEARCH_TOKENS) {
    fail(`default search ~${maxTokens} tokens for "${maxTokensQuery}" (max ${MAX_SEARCH_TOKENS})`);
} else {
    pass(`largest default search ~${maxTokens} tokens ("${maxTokensQuery}")`);
}
for (const q of EXPERIMENT_QUERIES) {
    const tokens = tokensByQuery.get(q) ?? estimateTokens(searchText(await searchSymbols(q)));
    if (tokens >= MAX_EXPERIMENT_TOKENS)
        fail(`"${q}" ~${tokens} tokens (max ${MAX_EXPERIMENT_TOKENS})`);
    else pass(`"${q}" ~${tokens} tokens`);
}

// Formerly zero-result queries must return their obvious hit in the top 3.
for (const c of cases.filter(c => c.source === 'zero-result')) {
    const results = await searchSymbols(c.query);
    if (isHit(results, c.expect)) pass(`"${c.query}" returns ${c.expect.join(' / ')} in the top 3`);
    else fail(`"${c.query}" lacks ${c.expect.join(' / ')} in the top 3: ${label(results)}`);
}

// headerName reaches ColumnSpec.headerName with its JSDoc.
{
    const hit = (await searchSymbols('headerName')).members
        .slice(0, 3)
        .find(h => h.entry.ownerName === 'ColumnSpec' && h.entry.name === 'headerName');
    if (hit && hit.summary.length > 0 && !hit.entry.jsDocInheritedFrom) {
        pass('"headerName" reaches ColumnSpec.headerName with its own JSDoc');
    } else {
        fail('"headerName" does not reach ColumnSpec.headerName with JSDoc');
    }
}

// Structural checks.
{
    const internal = await searchSymbols('chooserNameColumn'),
        lifted = await searchSymbols('chooserNameColumn', {includeInternal: true});
    if (internal.symbols.some(h => h.entry.name === 'chooserNameColumn'))
        fail('impl/ symbol returned by default');
    else pass('impl/ symbols excluded by default');
    if (lifted.symbols[0]?.entry.name === 'chooserNameColumn')
        pass('includeInternal returns impl/ symbols');
    else fail('includeInternal does not return impl/ symbols');

    const generic = await searchSymbols('title'),
        named = await searchSymbols('panel title');
    if (generic.members.some(h => h.entry.ownerName.endsWith('Props')))
        fail('"title" returns Props members without naming an owner');
    else pass('"title" returns no Props members');
    if (
        named.members
            .slice(0, 3)
            .some(h => h.entry.ownerName === 'PanelProps' && h.entry.name === 'title')
    ) {
        pass('"panel title" returns PanelProps.title');
    } else {
        fail(`"panel title" lacks PanelProps.title: ${label(named)}`);
    }

    const classes = await searchSymbols('grid', {kind: 'class'});
    if (classes.symbols.length > 0 && classes.symbols.every(h => h.entry.kind === 'class'))
        pass('kind filter');
    else fail('kind filter');

    const empty = await searchSymbols('how to the');
    if (empty.symbols.length === 0 && empty.members.length === 0)
        pass('stop-word-only query returns nothing');
    else fail('stop-word-only query should return nothing');

    const select = await searchSymbols('Select');
    if (
        select.symbols[0]?.entry.name === 'Select' &&
        select.symbols[0].factory === 'select' &&
        select.symbols[0].props === 'SelectProps'
    ) {
        pass('"Select" folds Select / select / SelectProps into the first hit');
    } else {
        fail(`"Select" first hit: ${label(select)}`);
    }
}

// Tool-level acceptance checks.
{
    const columnSpec = await describeSymbol({name: 'ColumnSpec'}, 'mcp');
    if (
        columnSpec.ok &&
        columnSpec.text.includes("from '@xh/hoist/cmp/grid'") &&
        columnSpec.text.includes('## Members') &&
        columnSpec.text.includes('- headerName?:')
    ) {
        pass('hoist-get-symbol ColumnSpec shows the import path and a member summary');
    } else {
        fail('hoist-get-symbol ColumnSpec lacks the import path or member summary');
    }

    const gridModel = await describeSymbol({name: 'GridModel'}, 'mcp');
    if (
        gridModel.ok &&
        gridModel.structured.members &&
        gridModel.structured.members.shown <= 60 &&
        gridModel.text.includes('more members not shown')
    ) {
        pass('hoist-get-symbol GridModel caps the member summary at 60 lines');
    } else {
        fail('hoist-get-symbol GridModel member summary cap');
    }

    const fieldType = await describeSymbol({name: 'FieldType'}, 'mcp');
    if (
        fieldType.ok &&
        fieldType.structured.otherDeclarations.length === 1 &&
        fieldType.text.includes('# FieldType (type)') &&
        fieldType.text.includes('# FieldType (const)')
    ) {
        pass('hoist-get-symbol FieldType returns both declarations');
    } else {
        fail('hoist-get-symbol FieldType does not return both declarations');
    }

    const buttonProps = await describeMembers({name: 'ButtonProps'}, 'mcp');
    if (
        buttonProps.ok &&
        buttonProps.structured.externalMembers.some(
            g => g.module === '@blueprintjs/core' && g.members.some(m => m.name === 'onClick')
        )
    ) {
        pass('hoist-get-members ButtonProps lists onClick under external (Blueprint) members');
    } else {
        fail('hoist-get-members ButtonProps lacks onClick under external members');
    }

    const clicks = await describeMembers({name: 'PanelProps', filter: 'click'}, 'mcp');
    if (
        clicks.ok &&
        clicks.structured.externalMembers.some(
            g => g.module === '@types/react' && g.members.some(m => m.name === 'onClick')
        )
    ) {
        pass('hoist-get-members PanelProps filter "click" reaches React onClick');
    } else {
        fail('hoist-get-members PanelProps filter "click" does not reach React onClick');
    }

    const fieldTypeMembers = await describeMembers({name: 'FieldType'}, 'mcp');
    if (
        !fieldTypeMembers.ok &&
        fieldTypeMembers.text.includes('not a class or interface') &&
        fieldTypeMembers.text.includes('hoist-get-symbol')
    ) {
        pass('hoist-get-members FieldType explains itself');
    } else {
        fail('hoist-get-members FieldType is not an explained error');
    }

    const col = await describeMembers({name: 'GridModel', filter: 'col'}, 'mcp'),
        colTokens = col.ok ? estimateTokens(`${col.text}\n\n${col.hint}`) : Infinity;
    if (colTokens < MAX_FILTERED_MEMBERS_TOKENS)
        pass(`hoist-get-members GridModel filter "col" ~${colTokens} tokens`);
    else
        fail(
            `hoist-get-members GridModel filter "col" ~${colTokens} tokens (max ${MAX_FILTERED_MEMBERS_TOKENS})`
        );

    const column = await describeMembers({name: 'Column', filter: 'headerName'}, 'mcp');
    if (
        column.ok &&
        column.structured.members[0]?.jsDocInheritedFrom === 'ColumnSpec' &&
        column.structured.members[0].jsDoc.length > 0
    ) {
        pass('Column.headerName inherits its JSDoc from ColumnSpec');
    } else {
        fail('Column.headerName does not inherit JSDoc from ColumnSpec');
    }

    const collapsed = await describeMembers(
        {name: 'PanelModel', filter: 'collapsed', include: 'own'},
        'mcp'
    );
    if (
        collapsed.ok &&
        collapsed.structured.members.find(m => m.name === 'collapsed')?.default === 'false'
    ) {
        pass('PanelModel.collapsed reports its initializer as the default');
    } else {
        fail('PanelModel.collapsed default missing');
    }
}

console.log(`\nTotal: ${failures === 0 ? 'all checks passed' : `${failures} failed`}.`);
process.exit(failures === 0 ? 0 : 1);
