/* eslint-disable */
import type {Thunkable} from '@xh/hoist/core';
import type {ColumnSpec, ColumnGroupSpec, GridConfig, GridSorterSpec} from '@xh/hoist/cmp/grid';
import type {
    FieldSpec,
    FilterLike,
    FilterSpec,
    FieldFilterSpec,
    RuleLike,
    StoreConfig
} from '@xh/hoist/data';
import type {DashCanvasItemState} from '@xh/hoist/desktop/cmp/dash';
import type {NumberFormatOptions} from '@xh/hoist/format';
import type {ColDef} from 'ag-grid-community';
import type {Portable, PortableWith, Ref} from './Portable';

type Equal<A, B> =
    (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

//------------------------------------------------------------------
// 1. Thunkable and unions with a function branch
//------------------------------------------------------------------
export type T1 = Expect<Equal<Portable<Thunkable<string>>, string>>;
export type T2 = Expect<Equal<Portable<Thunkable<boolean>>, boolean>>;
export type T3 = Expect<Equal<Portable<string | ((v: number) => string)>, string>>;
export type T4 = Expect<Equal<Portable<() => void>, never>>;

//------------------------------------------------------------------
// 2. ColumnSpec
//------------------------------------------------------------------
type PCol = Portable<ColumnSpec>;

// Kept: plain keys.
export const okCol: PCol = {
    field: 'pnl',
    colId: 'pnl',
    headerName: 'P&L', // ColumnHeaderNameFn | ReactNode -> string | number | boolean | ...
    width: 120,
    align: 'right',
    hidden: false,
    pinned: 'left',
    sortingOrder: ['desc', 'asc', null],
    omit: false, // Thunkable<boolean> -> boolean
    tooltip: true, // boolean | ColumnTooltipFn -> boolean
    exportValue: 'pnlRaw', // string | Fn -> string
    appData: {anything: 1}
};

// Object form of `field` survives as a portable FieldSpec.
export const okColField: PCol = {field: {name: 'pnl', type: 'number', displayName: 'P&L'}};

// Dropped: function-only keys are not assignable.
// @ts-expect-error - renderer is gone
export const badCol1: PCol = {renderer: (v: any) => v};
// @ts-expect-error - getValueFn is gone
export const badCol2: PCol = {getValueFn: () => 1};
// @ts-expect-error - comparator is gone
export const badCol3: PCol = {comparator: () => 0};
// @ts-expect-error - a lambda is not a portable headerName
export const badCol4: PCol = {headerName: () => 'x'};
// @ts-expect-error - a React element is not a portable headerName
export const badCol5: PCol = {headerName: null as React.ReactElement};

// Which keys disappeared? Lists keys of ColumnSpec not in Portable<ColumnSpec>.
export type LostColumnKeys = Exclude<keyof ColumnSpec, keyof PCol>;
export type T5 = Expect<
    Equal<
        LostColumnKeys,
        | 'cellFlag'
        | 'comparator'
        | 'editor'
        | 'getValueFn'
        | 'onCellClicked'
        | 'renderer'
        | 'setValueFn'
        | 'sortToBottom' // Some<unknown | fn>: unknown maps to never - see LIMIT 3
        | 'textRenderer'
    >
>;

//------------------------------------------------------------------
// 3. Reference slots: renderer becomes a registry reference, not nothing.
//------------------------------------------------------------------
type NumberFmtRef = Ref<'number' | 'percent' | 'millions', Portable<NumberFormatOptions>>;
type PColRefs = PortableWith<ColumnSpec, {renderer?: Ref; textRenderer?: NumberFmtRef}>;
export const refCol: PColRefs = {
    field: 'pnl',
    textRenderer: {name: 'number', args: {precision: 0, ledger: true, colorSpec: true}},
    renderer: 'app.pnlSparkline'
};
// @ts-expect-error - unknown format name
export const badRef: PColRefs = {textRenderer: {name: 'nope'}};

//------------------------------------------------------------------
// 4. Discriminated union: FilterSpec drops FunctionFilterSpec (required testFn)
//------------------------------------------------------------------
type PFilter = Portable<FilterSpec>;
export const okFilter: PFilter = {field: 'region', op: '=', value: 'EMEA'};
export const okCompound: PFilter = {
    op: 'OR',
    filters: [
        {field: 'a', op: '>', value: 1},
        {field: 'b', op: '<', value: 2}
    ]
};
// @ts-expect-error - FunctionFilterSpec is not portable
export const badFilter: PFilter = {key: 'k', testFn: () => true};

// FieldFilterSpec.field is string | Field (a class) -> string only.
export type T6 = Expect<Equal<Portable<FieldFilterSpec>['field'], string>>;

// Recursive FilterLike: still resolves.
export const okFilterLike: Portable<FilterLike> = [{field: 'a', op: '=', value: 1}];

//------------------------------------------------------------------
// 5. Validation rules: RuleSpec has a required `check` fn -> whole rule dropped.
//------------------------------------------------------------------
export type T7 = Expect<Equal<Portable<RuleLike>, never>>;
// So FieldSpec loses `rules` entirely.
export type T8 = Expect<Equal<Exclude<keyof FieldSpec, keyof Portable<FieldSpec>>, 'rules'>>;

//------------------------------------------------------------------
// 6. StoreConfig: idSpec string survives, processRawData dropped, filter portable.
//------------------------------------------------------------------
type PStore = Portable<StoreConfig>;
export const okStore: PStore = {
    fields: ['id', {name: 'pnl', type: 'number'}],
    idSpec: 'id',
    filter: {field: 'pnl', op: '>', value: 0}
};
// @ts-expect-error - processRawData is gone
export const badStore: PStore = {processRawData: (d: any) => d};

//------------------------------------------------------------------
// 7. Already-portable types should map to themselves.
//------------------------------------------------------------------
export type T9 = Expect<Equal<Portable<GridSorterSpec>, GridSorterSpec>>;
export const dashItem: Portable<DashCanvasItemState> = {
    layout: {x: 0, y: 0, w: 4, h: 4},
    viewSpecId: 'chart',
    state: {anything: true}
};

//------------------------------------------------------------------
// 8. Column groups (recursive children) and a big third-party type.
//------------------------------------------------------------------
export const okGroup: Portable<ColumnGroupSpec> = {
    groupId: 'px',
    headerName: 'Pricing',
    children: [{field: 'bid'}, {field: 'ask'}, {groupId: 'inner', children: [{field: 'mid'}]}]
};
export const okAgCol: Portable<ColDef> = {headerName: 'x', width: 10, cellStyle: {color: 'red'}};

//------------------------------------------------------------------
// 9. Whole GridConfig. Class-instance branches (Store, StoreSelectionModel) drop; configs stay.
//------------------------------------------------------------------
type PGrid = Portable<GridConfig>;
export const okGrid: PGrid = {
    columns: [{field: 'a'}, {groupId: 'g', children: [{field: 'b'}]}],
    store: {fields: ['a', 'b']},
    selModel: 'multiple',
    sortBy: ['a|desc'],
    groupBy: 'region',
    persistWith: {localStorageKey: 'x'},
    contextMenu: ['copyCell', '-', 'export'],
    levelLabels: ['Region', 'Desk']
};
// @ts-expect-error - a RecordAction spec without a function is still assignable? (see note)
export const badGridMenu: PGrid = {contextMenu: () => []};
export type LostGridKeys = Exclude<keyof GridConfig, keyof PGrid>;

export type T10 = Expect<
    Equal<
        LostGridKeys,
        | 'groupRowRenderer'
        | 'groupSortFn'
        | 'onCellClicked'
        | 'onCellContextMenu'
        | 'onCellDoubleClicked'
        | 'onKeyDown'
        | 'onRowClicked'
        | 'onRowDoubleClicked'
        | 'restoreDefaultsFn'
        | 'rowClassFn'
    >
>;

//------------------------------------------------------------------
// LIMITS - each line compiles, and each shows a hole.
//------------------------------------------------------------------
// LIMIT 1: Record<string, Fn> (cellClassRules, rowClassRules) maps to {} - accepts any object.
export const limit1: Portable<ColumnSpec>['cellClassRules'] = {foo: 'not a function, but accepted'};
// LIMIT 2: shape survives without meaning. A RecordActionSpec loses actionFn but still type-checks.
export const limit2: Portable<GridConfig>['contextMenu'] = [{text: 'Delete', intent: 'danger'}];
// LIMIT 3: unknown maps to never (sortToBottom lost). Fixable by treating unknown like any.
// LIMIT 4: a function slot cannot become a *reference* automatically - function types are
// structural, so ColumnExportValueFn and ColumnSortValueFn are the same type. Use PortableWith<>.
import type {ColumnExportValueFn, ColumnSortValueFn} from '@xh/hoist/cmp/grid';
export type Limit4 = Expect<Equal<ColumnExportValueFn, ColumnSortValueFn>>;

//------------------------------------------------------------------
// CONFIG FRAMING (coordinator) - a whole-chart *Config* with live objects, projected.
//------------------------------------------------------------------
import type {Store, StoreConfig as SC} from '@xh/hoist/data';
import type {GridModel, GridModelPersistOptions} from '@xh/hoist/cmp/grid';
import type {PlainObject} from '@xh/hoist/core';
interface TimeSeriesSpec {
    id: string;
    field?: string;
    type?: 'line' | 'area';
    name?: Thunkable<string>;
    tooltipFn?: (p: PlainObject) => string;
}
interface TimeSeriesChartConfig {
    series: TimeSeriesSpec[];
    timeField: string;
    compare?: {mode: 'none' | 'percent'};
    binding?: {source: string; params?: PlainObject};
    store?: Store | SC;
    gridModel?: GridModel;
    persistWith?: GridModelPersistOptions;
    sourceResolver?: (b: PlainObject) => Promise<Store>;
    onPointClick?: (e: PlainObject) => void;
}
type PChart = Portable<TimeSeriesChartConfig>;
export const okChart: PChart = {
    series: [{id: 'fund', field: 'FUND', name: 'Fund'}],
    timeField: 'date',
    binding: {source: 'navs'},
    store: {fields: ['date', 'FUND']}
};
export type TC1 = Expect<
    Equal<
        Exclude<keyof TimeSeriesChartConfig, keyof PChart>,
        'gridModel' | 'sourceResolver' | 'onPointClick'
    >
>;
// @ts-expect-error - a live Store instance is not portable
export const badChart: PChart = {series: [], timeField: 'd', store: null as Store};
