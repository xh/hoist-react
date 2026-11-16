# Hoist patterns reference (for Chart V2 API design)

Signatures copied from source at `91.0.0-SNAPSHOT`. JSDoc trimmed. `file:line` points at the
declaration. Paths are relative to the hoist-react root unless marked `toolbox`.

Shared aliases (`core/types/Types.ts`):

```ts
export type Some<T> = T | T[];                                           // :36
export type Thunkable<T> = T | (() => T);                                // :39
export type PlainObject = Record<string, any>;                           // :46
export type DebounceSpec = number | (DebounceSettings & {interval: number}); // :57
export type VSide = 'top' | 'bottom';                                    // :28
export type HSide = 'left' | 'right';                                    // :29
export type HAlign = 'left' | 'right' | 'center';                        // :32
export type Theme = 'system' | 'dark' | 'light';                         // :25
// core/types/Interfaces.ts:434
export type ContextMenuSpec<T = MenuToken, C = MenuContext> =
    | MenuItemLike<T, C>[]
    | ((e: MouseEvent | PointerEvent, context: C) => MenuItemLike<T, C>[])
    | boolean;
```

---

## 1. Current ChartModel (baseline)

```ts
// cmp/chart/ChartModel.ts:16  (NOT exported)
interface ChartConfig {
    highchartsConfig: PlainObject;
    series?: Some<any>;
    contextMenu?: ChartContextMenuSpec;   // true (default) / false / spec. Desktop only.
    xhImpl?: boolean;
    xhName?: string;
}

export interface ChartModelDefaults {     // :35
    contextMenu?: ChartMenuToken[];
}

export class ChartModel extends HoistModel {              // :52
    static defaults: ChartModelDefaults;                  // :54 - viewFullscreen,-,copyToClipboard,printChart,-,downloadPNG,downloadSVG,downloadCSV
    @observableRef accessor highchartsConfig: PlainObject = {};   // :67
    @observableRef accessor series: any[] = [];                   // :69
    contextMenu: ChartContextMenuSpec;                            // :71
    @observableRef accessor highchart: any;                       // :78
    @computed get empty(): boolean;                               // :81
    constructor(config?: ChartConfig);                            // :86
    @action setHighchartsConfig(config: any);                     // :113
    @action updateHighchartsConfig(update: any);                  // :124 - mergeDeep
    @action setSeries(series: any | any[]);                       // :130
    clear();                                                      // :136
}

// cmp/chart/Types.ts
export type ChartMenuToken =
    | 'viewFullscreen' | 'printChart' | 'downloadJPEG' | 'downloadPNG' | 'downloadSVG'
    | 'downloadCSV' | 'downloadXLS' | 'downloadPDF' | 'copyToClipboard' | MenuToken;   // :14
export interface ChartMenuContext extends MenuContext {                                // :26
    chartModel: ChartModel;
    point: any;
    points: any[];
}
export type ChartContextMenuSpec = ContextMenuSpec<ChartMenuToken, ChartMenuContext>;  // :39

// cmp/chart/Chart.ts:33
export interface ChartProps<M extends ChartModel = ChartModel>
    extends HoistProps<M>, LayoutProps, TestSupportProps {
    aspectRatio?: number;
}
export const [Chart, chart] = hoistCmp.withFactory<ChartProps>({...});   // :48

// kit/highcharts/index.ts
export let Highcharts = null;                       // :10
export function installHighcharts(HighchartsImpl);  // :19 - requires 12.4.0 <= v <= 12.*.*
```

Merge order at render: `mergeDeep(defaultConf, themeConf, {...highchartsConfig, series})`
(`Chart.ts:237-244`).

---

## 2. GridModel

### GridConfig (key members) - `cmp/grid/GridModel.ts:153`

```ts
export interface GridConfig {
    columns?: ColumnOrGroupSpec[];
    colDefaults?: Partial<ColumnSpec>;
    store?: Store | StoreConfig;
    treeMode?: boolean;
    showSummary?: boolean | VSide;
    selModel?: StoreSelectionModel | StoreSelectionConfig | 'single' | 'multiple' | 'disabled';
    filterModel?: GridFilterModelConfig | boolean;
    colChooserModel?: Omit<ColChooserConfig, 'gridModel'> | ColChooserMode | boolean;
    restoreDefaultsFn?: () => Awaitable<void>;
    restoreDefaultsWarning?: ReactNode;
    persistWith?: GridModelPersistOptions;
    emptyText?: ReactNode;
    hideEmptyTextBeforeLoad?: boolean;
    sortBy?: Some<GridSorterLike>;
    groupBy?: Some<string>;
    expandLevel?: number;
    sizingMode?: SizingMode;
    theme?: AgGridThemeParams;
    enableExport?: boolean;
    exportOptions?: ExportOptions;
    contextMenu?: GridContextMenuSpec | false;
    headerContextMenu?: GridHeaderContextMenuSpec | false;
    levelLabels?: Thunkable<string[]>;
    autosizeOptions?: GridAutosizeOptions;
    onRowClicked?: (e: RowClickedEvent) => void;
    onCellClicked?: (e: CellClickedEvent) => void;
    experimental?: GridExperimentalFlags;
    appData?: PlainObject;          // :423 - unknown ctor keys throw, pointing here (:858-864)
    xhName?: string;
    xhImpl?: boolean;
    // ...~30 more display/behaviour flags
}
```

### GridModelDefaults - `GridModel.ts:459`

```ts
export interface GridModelDefaults {
    autosizeMode?: GridAutosizeMode;
    cellBorders?: boolean;
    clicksToExpand?: number | null;
    colChooserModel?: Omit<ColChooserConfig, 'gridModel'> | ColChooserMode | boolean | null;
    colDefaults?: Partial<ColumnSpec> | null;
    contextMenu?: GridContextMenuItemLike[];
    headerContextMenu?: GridContextMenuItemLike[];
    emptyText?: ReactNode | null;
    enableColumnPinning?: boolean;
    enableExport?: boolean;
    exportOptions?: ExportOptions;
    headerMenuDisplay?: 'always' | 'hover';
    lockColumnGroups?: boolean;
    restoreDefaultsWarning?: ReactNode;
    rowBorders?: boolean | null;
    showCellFocus?: boolean;
    showGroupRowCounts?: boolean;
    showHover?: boolean;
    sizingMode?: SizingMode | null;
    stripeRows?: boolean | null;
    treeStyle?: TreeStyle;
}
```

Usage in ctor: `colChooserModel = GridModel.defaults.colChooserModel` etc. Pattern: instance config
wins, `static defaults` fills gaps, then a hard-coded fallback.

### GridModel key members - `GridModel.ts:505`

```ts
export class GridModel extends HoistModel implements GridLikeModel {
    static defaults: GridModelDefaults;                                  // :518
    store: Store;
    selModel: StoreSelectionModel;
    colChooserModel: IColChooserModel;                                   // :580
    colDefaults: Partial<ColumnSpec>;                                    // :604
    appData: PlainObject;
    @managed filterModel: GridFilterModel;                               // :615
    @managed agGridModel: AgGridModel;                                   // :616

    // Observable API - :622-628
    @observableRef accessor columns: ColumnOrGroup[] = [];
    @observableRef accessor columnState: ColumnState[] = [];
    @observableRef accessor columnGroupState: ColumnGroupState[] = [];
    @observableRef accessor expandState: any = {};
    @observableRef accessor sortBy: GridSorter[] = [];
    @observableRef accessor groupBy: string[] = null;
    @observable accessor expandLevel: number = 0;

    @computedStruct get persistableColumnState(): ColumnState[];         // :639
    @bindable accessor showSummary: boolean | VSide = false;             // :644
    @bindableRef accessor emptyText: ReactNode;                          // :645

    private _defaultState; // {columns, sortBy, groupBy, expandLevel, filter?}  :665, set :759

    constructor(config: GridConfig);                                     // :693
    async restoreDefaultsAsync(): Promise<boolean>;                      // :874
    @action setGroupBy(colIds: Some<string>);                            // :1231
    @action expandToLevel(level: number);                                // :1260
    @action setSortBy(sorters: Some<GridSorterLike>);                    // :1310
    loadData(rawData: any[], rawSummaryData?: Some<PlainObject>);        // :1337
    @action setColumns(colConfigs: ColumnOrGroupSpec[]);                 // :1362
    @action setColumnState(colState: ColumnState[], opts?: ColumnStateOptions);  // :1383
    @action setColumnGroupState(groupState: ColumnGroupState[]);         // :1393
    showColChooser();                                                    // :1430
    @action updateColumnState(colStateChanges: Partial<ColumnState>[]): void;   // :1496
    getColumn(colId: string): Column;                                    // :1527
    getLeafColumns(): Column[];                                          // :1563
    getVisibleLeafColumns(): Column[];                                   // :1578
    isColumnVisible(colId: string): boolean;                             // :1588
    setColumnVisible(colId: string, visible: boolean);                   // :1606
    showColumn(colId: string);  hideColumn(colId: string);               // :1610, :1614
    getStateForColumn(colId: string): ColumnState;                       // :1677

    // private
    private buildColumn(config, borderedGroup?): ColumnOrGroup;          // :1872 - applies colDefaults, omit
    private withColDefaults(config, defaults): Partial<ColumnSpec>;      // :1893
    private parseAndSetColumnsAndStore(colConfigs, storeOrConfig = {});  // :1977
    private cleanColumnState(columnState, opts?);                        // :2040
    private enhanceColConfigsFromStore(colConfigs, storeOrConfig?);      // :2089
    private enhanceStoreConfigFromColumns(storeConfig: StoreConfig);     // :2181
    private getDefaultStateForColumn(column: Column): ColumnState;       // :2378
}
```

Constructor order that matters (`GridModel.ts:759-843`):
1. `_defaultState = {columns, sortBy, groupBy, expandLevel}`.
2. `colDefaults = withColDefaults(colDefaults, GridModel.defaults.colDefaults)`.
3. `parseAndSetColumnsAndStore(columns, store)` - enhance specs from store fields, build columns,
   create store with fields inferred from columns.
4. `setGroupBy`, `setSortBy`.
5. child models (agGridModel, colChooserModel, selModel, filterModel).
6. `if (persistWith) initPersist(this, persistWith)` - after defaults exist.
7. `Object.assign(this, rest)` earlier, then throw if `rest` not empty.

`colDefaults` merge rule (`GridModel.ts:1893-1906`): `defaultsDeep({}, config, defaults)`, except a
spec's own `tooltip`, `renderer` or `textRenderer` blocks the default (never deep-merged).

Field-derived column defaults (`GridModel.ts:2089-2175`): from `Field` take `displayName`,
`description`; `align: 'right'` for `int`/`number`; `sortingOrder` DESC_FIRST for number/date;
`headerName = shortDisplayName` when the column does not name itself. Spec values always win
(`...col` last).

### ColumnSpec key members - `cmp/grid/columns/Column.ts:87`

```ts
export interface ColumnSpec {
    field?: string | FieldSpec | CubeFieldSpec;   // :93 - object form adds the field to the store
    colId?: string;                               // :99 - defaults to field name
    displayName?: string;                         // :115
    description?: string;                         // :122
    headerName?: ColumnHeaderNameFn | ReactNode;  // :129
    headerTooltip?: string;
    hidden?: boolean;                             // :168
    width?: number;  minWidth?: number;  maxWidth?: number;  flex?: boolean | number;
    align?: HAlign;                               // :209
    sortingOrder?: Array<'asc' | 'desc' | ColumnSortSpec | null>;
    absSort?: boolean;
    resizable?: boolean;  sortable?: boolean;  movable?: boolean;  filterable?: boolean;
    hideable?: boolean;                           // :259
    pinned?: boolean | HSide;                     // :265
    textRenderer?: ColumnTextRenderer;            // :284
    renderer?: ColumnRenderer;                    // :301
    rendererIsComplex?: boolean;
    tooltip?: boolean | ColumnTooltipFn;
    chooserName?: string;                         // :325
    chooserGroup?: string;                        // :332
    chooserDescription?: string;
    excludeFromChooser?: boolean;                 // :344
    exportName?: string | ColumnHeaderNameFn;
    exportValue?: string | ColumnExportValueFn;
    excludeFromExport?: boolean;
    omit?: Thunkable<boolean>;                    // :433
    actions?: Array<RecordActionSpec | RecordAction>;
    onCellClicked?: (e: CellClickedEvent) => void;
    agOptions?: ColDef;                           // :459 - escape hatch
    appData?: PlainObject;                        // :462
}

export class Column {                             // :485 - plain class, NOT HoistBase, not observable
    static ASC_FIRST: ColumnSortSpec[];  static DESC_FIRST: ColumnSortSpec[];  static ABS_DESC_FIRST: ColumnSortSpec[];
    field: string;  colId: string;  displayName: string;  ...   // readonly-by-convention copies of spec
    fieldSpec: FieldSpec;                         // :576 - set when spec.field is an object
    gridModel: GridModel;                         // :580
    agOptions: ColDef;  appData: PlainObject;
    constructor(spec: ColumnSpec, gridModel: GridModel);   // :591
    getAgSpec(): ColDef;                          // :808
}

// renderer types - cmp/grid/Types.ts
export interface CellContext {...}                                          // :419
export type ColumnRenderer<T = any, R = ReactNode> =
    ((value: T, context: CellContext) => R) & {...};                         // :436
export type ColumnTextRenderer<T = any> = ColumnRenderer<T, string>;        // :444

// Pre-built specs - cmp/grid/columns/Core.ts
export const number: ColumnSpec = {align: 'right', textRenderer: numberTextRenderer({})};
// also boolCheck, fileExt, tags; DatesTimes.ts: date, dateTime, ...

// ColumnGroupSpec - cmp/grid/columns/ColumnGroup.ts:37
export interface ColumnGroupSpec {
    children: Array<ColumnGroupSpec | ColumnSpec>;
    groupId?: string;
    headerName?: ReactNode | ColumnHeaderNameFn;
    chooserName?: string;
    borders?: boolean;
    groupShowMode?: ColumnGroupShowMode;
    collapsed?: boolean;
    agOptions?: PlainObject;
    omit?: Thunkable<boolean>;
    appData?: PlainObject;
}

// Grid component escape hatch - cmp/grid/Grid.ts:67, :81
type GridAgOptions = PartialDeep<Omit<GridOptions, DomGridOptions>> & {...};
agOptions?: GridAgOptions;   // GridProps - "changes after initial render are ignored"
```

### Column chooser - `cmp/grid/Types.ts`

```ts
export interface IColChooserModel extends HoistModel {   // :258
    readonly gridModel: GridModel;
    readonly mode: ColChooserMode;
    readonly isOpen: boolean;
    open(): void;  close(): void;  toggle(): void;
}
export type ColChooserMode = 'modal' | 'docked';         // :272
export interface ColChooserConfig {                      // :281
    gridModel?: GridModel;
    mode?: ColChooserMode;
    commitOnChange?: boolean;
    showRestoreDefaults?: boolean;
    autosizeOnCommit?: boolean;
    width?: string | number;
    height?: string | number;
    filterMatchMode?: FilterMatchMode;
    columnLibrary?: boolean | ColLibraryConfig;
    panelConfig?: Omit<PanelConfig, 'side' | 'collapsible'> & {side?: HSide};
}
```

Desktop impl: `desktop/cmp/grid/impl/colchooser/` (`ColChooserModel`, `ModalColChooserModel`,
`DockedColChooserModel`, `ColLibraryModel`).

---

## 3. GridModel persistence

### Options - `cmp/grid/Types.ts:165`

```ts
export interface GridModelPersistOptions extends PersistOptions {
    persistColumns?: boolean | PersistOptions;       // default true
    persistColumnGroups?: boolean | PersistOptions;  // default true
    persistGrouping?: boolean | PersistOptions;      // default true
    persistSort?: boolean | PersistOptions;          // default true
    persistExpandToLevel?: boolean | PersistOptions; // default true
    hideNewColumns?: boolean;   // default: true for DashViewProvider / non-default ViewManager view, else false
}
```

### State types - `cmp/grid/Types.ts`

```ts
export interface ColumnState {          // :37
    colId: string;
    width: number;
    hidden: boolean;
    manuallySized?: boolean;
    pinned?: HSide;                     // side if pinned, null if not
}
export interface ColumnGroupState {     // :52
    groupId: string;
    expanded: boolean;
}
export interface ColumnStateOptions {   // :58
    hideNewColumns?: boolean;
}
// cmp/grid/GridSorter.ts
export type GridSorterLike = GridSorterSpec | string | GridSorter;     // :9
export interface GridSorterSpec { colId: string; sort?: 'asc'|'desc'|'ASC'|'DESC'; abs?: boolean; }  // :17
toString(): string  // "colId|desc|abs" - joins [colId, sort, abs ? 'abs' : null]  :62
```

### Wiring - `cmp/grid/impl/InitPersist.ts:24`

```ts
export function initPersist(gridModel: GridModel, {
    persistColumns = true, persistColumnGroups = true, persistGrouping = true,
    persistSort = true, persistExpandToLevel = true, hideNewColumns,
    path = 'grid',
    ...rootPersistWith
}: GridModelPersistOptions)
```

One `PersistenceProvider.create({persistOptions, target, owner: gridModel})` per key. Options per key
are `persistOptions({path: `${path}.<key>`}, rootPersistWith, isObject(flag) ? flag : null)`.

| Key (path) | getPersistableState | setPersistableState | Ref |
|---|---|---|---|
| `grid.columns` | `new PersistableColumnState(gridModel.persistableColumnState)` | `setColumnState(value, {hideNewColumns})`, then autosize if managed | `:37-67` |
| `grid.columnGroups` | `new PersistableState(gridModel.columnGroupState)` | `setColumnGroupState(value)` | `:69-82` |
| `grid.sortBy` | `new PersistableState(sortBy.map(it => it.toString()))` | `setSortBy(value)` | `:84-98` |
| `grid.groupBy` | `new PersistableState(gridModel.groupBy)` | `setGroupBy(value)` | `:100-113` |
| `grid.expandLevel` | `new PersistableState(gridModel.expandLevel)` | `expandToLevel(value)` | `:115-128` |

`PersistableColumnState.equals` compares only non-hidden entries (`InitPersist.ts:154-161`).

### Persisted JSON shape (relative to the provider root)

```json
{
  "grid": {
    "columns": [
      {"colId": "name", "hidden": false, "manuallySized": false},
      {"colId": "pnl", "width": 120, "hidden": false, "manuallySized": true, "pinned": "left"},
      {"colId": "notes", "hidden": true}
    ],
    "columnGroups": [{"groupId": "pricing", "expanded": false}],
    "sortBy": ["pnl|desc|abs"],
    "groupBy": ["region"],
    "expandLevel": 1
  }
}
```

`cleanColumnState()` rules (`GridModel.ts:2040-2084`): drop unknown/duplicate colIds; insert new
columns at their code index (hidden if `hideNewColumns` and `hideable && !excludeFromChooser`); drop
`width` unless resizable and `manuallySized`; hidden columns keep only `{colId, hidden}`. Each key is
written only when it differs from the default captured at bind time; equal-to-default clears the
key (`PersistenceProvider.ts:206-207`). Column order = array order.

---

## 4. Persistence core - `core/persist/`

### PersistOptions - `PersistOptions.ts:20`

```ts
export type PersistenceProviderType =
    'pref' | 'localStorage' | 'sessionStorage' | 'dashView' | 'viewManager' | 'custom';   // :17

export interface PersistOptions {
    path?: string;
    pathPrefix?: string;      // concatenated (not replaced) when merged via persistOptions()
    debounce?: DebounceSpec;  // provider default 250
    settleTime?: number;
    type?: PersistenceProviderType | Class<PersistenceProvider, [PersistenceProviderConfig]>;
    prefKey?: string;
    localStorageKey?: string;
    sessionStorageKey?: string;
    dashViewModel?: DashViewModel;
    viewManagerModel?: ViewManagerModel;
    getData?: () => any;
    setData?: (data: object) => void;
}

/** Leftmost = defaults, rightmost wins. Type-related keys replace as a group. pathPrefix concatenates. */
export function persistOptions(...options: Array<PersistOptions>): PersistOptions;   // :106
```

Shortcut-key -> provider registration (`core/persist/index.ts:25-32`): `prefKey` -> `PrefProvider`,
`localStorageKey` -> `LocalStorageProvider`, `sessionStorageKey` -> `SessionStorageProvider`,
`dashViewModel` -> `DashViewProvider`, `viewManagerModel` -> `ViewManagerProvider`,
`getData`/`setData` -> `CustomProvider`.

### Persistable - `Persistable.ts`

```ts
export interface Persistable<S> {                      // :13 - S must be JSON-serializable
    getPersistableState(): PersistableState<S>;        // must be observable (read in a reaction)
    setPersistableState(state: PersistableState<S>): void;
}
export class PersistableState<S> {                     // :19
    value: S;
    constructor(value: S);
    equals(other: PersistableState<S>): boolean;       // isEqual(value, other.value); override for custom
}
```

### PersistenceProvider - `PersistenceProvider.ts`

```ts
export type PersistenceProviderConfig<S = any> = {     // :32
    persistOptions: PersistOptions;
    target: Persistable<S>;
    owner?: HoistBase;                                 // defaults to target if HoistBase
};

export abstract class PersistenceProvider<S = any> {   // :67
    readonly path: string;            // pathPrefix ? `${pathPrefix}.${path}` : path - path required
    readonly debounce: DebounceSpec;
    readonly owner: HoistBase;        // provider is markManaged() by owner
    readonly settleTime: number;
    static create<S>(cfg: PersistenceProviderConfig<S>): PersistenceProvider<S>;  // :104 - null + logError on failure
    read(): PersistableState<S>;      // :123 - get(readRaw(), path)
    write(state: S);                  // :133
    clear();                          // :139 - deletes path, prunes empty parents
    destroy();                        // :157 - flushes pending debounced write
    pushStateToTarget();              // :163 - read() or defaultState -> target
    protected bindToTarget(target);   // :193
    protected writeRaw(obj);  protected readRaw();     // :225, :227 - subclasses implement
    static parseProviderClass<S>(opts: PersistOptions);  // :247 - @internal
}
```

`bindToTarget()` (`:193-217`): capture `defaultState = target.getPersistableState()`; read and apply
saved state; then a MobX reaction on `getPersistableState()` that: skips during `settleTime`, clears
when equal to default, otherwise writes. Rule (`:99-103`): set default state before `create()`,
add your own reactions after.

### HoistBase persistence API

```ts
// core/HoistBase.ts
persistWith: PersistOptions = null;                                              // :94
markPersist<P extends keyof this & string>(property: P, options: PersistOptions = {});  // :301
//   -> PersistenceProvider.create({persistOptions: persistOptions({path: property}, this.persistWith, options), ...})

// core/HoistBaseDecorators.ts
export function persist<This, V>(_value: ClassAccessorDecoratorTarget<This, V>,
    context: ClassAccessorDecoratorContext<This, V>): ClassAccessorDecoratorResult<This, V>;   // :54
persist.with = function (options: PersistOptions) {...};                                       // :65
// Usage: `@bindable @persist accessor foo` - @persist after the MobX decorator. Reads this.persistWith
// at field-init time, so declare `override persistWith = {...}` above the field (toolbox WeatherDashModel.ts:48-50).
```

### Providers relevant to Chart V2

```ts
// core/persist/provider/DashViewProvider.ts:16
export class DashViewProvider<S> extends PersistenceProvider<S> {
    readonly dashViewModel: DashViewModel;
    // ctor: throwIf(!dashViewModel); dashViewModel.registerProvider(this)
    override readRaw() { return this.dashViewModel.viewState ?? {}; }       // :30
    override writeRaw(data) { this.dashViewModel.viewState = data; }        // :35
    override destroy() { this.dashViewModel?.unregisterProvider(this); super.destroy(); }
}
// core/persist/provider/ViewManagerProvider.ts:20
export class ViewManagerProvider<S> extends PersistenceProvider<S> {
    readonly viewManagerModel: ViewManagerModel;
    override readRaw() { return this.viewManagerModel.getValue(); }         // :34
    override writeRaw(data) { this.viewManagerModel.setValue(data); }       // :38
}
```

---

## 5. Data

### FieldSpec - `data/Field.ts:20`

```ts
export interface FieldSpec {
    name: string;
    type?: FieldType;              // default 'auto'
    displayName?: string;          // default genDisplayName(name)
    shortDisplayName?: string;     // default displayName
    description?: string;
    defaultValue?: any;
    isDimension?: boolean;
    rules?: RuleLike[];
    enableXssProtection?: boolean;
}
export const FieldType = Object.freeze({                                    // :211
    TAGS: 'tags', AUTO: 'auto', BOOL: 'bool', DATE: 'date', INT: 'int', JSON: 'json',
    LOCAL_DATE: 'localDate', NUMBER: 'number', PWD: 'pwd', STRING: 'string'
});
export type FieldType = (typeof FieldType)[keyof typeof FieldType];         // :225
export function genDisplayName(fieldName: string): string;                  // :231
export function getFieldName(field: string | Field | FieldSpec): string;    // :237
export class Field { readonly name; type; displayName; shortDisplayName; description; defaultValue; isDimension; rules; }  // :81
```

Note: `FieldSpec` has no format, unit or precision. Number formatting lives on columns today.

### CubeFieldSpec - `data/cube/CubeField.ts:28`

```ts
export interface CubeFieldSpec extends FieldSpec {
    aggregator?: Aggregator | AggregatorToken;
    canAggregateFn?: CanAggregateFn;
    isLeafDimension?: boolean;
    parentDimension?: string;
}
export type AggregatorToken = 'AVG' | 'AVG_STRICT' | 'CHILD_COUNT' | 'LEAF_COUNT' | 'MAX'
    | 'MEDIAN' | 'MIN' | 'NULL' | 'SINGLE' | 'SUM' | 'SUM_STRICT' | 'UNIQUE';   // :64
```

### StoreConfig - `data/Store.ts:84`

```ts
export interface StoreConfig {
    fields?: Array<string | FieldSpec | Field>;          // :86
    fieldDefaults?: Omit<FieldSpec, 'name'>;             // :92
    idSpec?: StoreRecordIdSpec;                          // :102  string | ((data) => StoreRecordId)
    data?: PlainObject[];                                // :107
    processRawData?: (data: PlainObject) => PlainObject; // :116
    filter?: FilterLike;                                 // :122
    filterIncludesChildren?: boolean;
    loadTreeData?: boolean;
    loadTreeDataFrom?: string;
    loadRootAsSummary?: boolean;
    freezeData?: boolean;
    idEncodesTreePath?: boolean;
    digestSpec?: StoreRecordDigestSpec;
    retainRaw?: boolean;
    projectionOnly?: boolean;
}
```

Store members a chart would read (`data/Store.ts`): `@observableRef filter` (:384),
`@observable lastUpdated` (:387), `@observable lastLoaded` (:390), `summaryRecords` (:397),
`loadData(rawData, rawSummaryData?)` (:537), `updateData(rawData | StoreTransaction)` (:643),
`get records` (:1025, filtered), `get allRecords` (:1033), `get rootRecords` (:1066),
`getField(name): Field` (:1013), `get fieldNames` (:1017), `@computed get count` (:1177).

`StoreRecord` (`data/StoreRecord.ts:32`): `readonly id`, `parentId`, `store`, `raw`, `data: PlainObject`
(read values as `record.data[fieldName]`), `get children`, `get parent`, `get depth`.

### Cube / Query / View - `data/cube/`

```ts
// Cube.ts:38
export interface CubeConfig {
    fields: CubeField[] | CubeFieldSpec[];
    fieldDefaults?: Partial<CubeFieldSpec>;
    data?: PlainObject[];
    idSpec?: StoreRecordIdSpec;
    processRawData?: (data: PlainObject) => PlainObject;
    store?: CubeStoreConfig;
    info?: PlainObject;
    lockFn?: LockFn;  bucketSpecFn?: BucketSpecFn;  omitFn?: OmitFn;
    xhName?: string;
}
executeQuery(query: QueryConfig): ViewRowData[];                       // Cube.ts:271 - static snapshot
createView({query, stores, connect = false, xhName = null}: {
    query: QueryConfig; stores?: Store[] | Store; connect?: boolean; xhName?: string;
}): View;                                                              // Cube.ts:295

// Query.ts:37
export interface QueryConfig {
    cube?: Cube;
    fields?: string[] | CubeField[];
    dimensions?: string[] | CubeField[];
    filter?: FilterLike;
    includeRoot?: boolean;
    includeLeaves?: boolean;
    provideLeaves?: boolean;
    omitRedundantNodes?: boolean;
    lockFn?: LockFn;  bucketSpecFn?: BucketSpecFn;  omitFn?: OmitFn;
    pivot?: PivotSpec;
}
export interface PivotSpec {                                           // :148
    dimensions: string[] | CubeField[];
    measures: string[] | CubeField[];
    excludeEmptyPivotValues?: boolean;
    maxPivotPaths?: number;
}

// View.ts
export interface ViewConfig { query: Query; stores?: Store[] | Store; connect?: boolean; xhName?: string; }  // :53
export interface ViewResult { rows: ViewRowData[]; leafMap; paths: PivotPath[]; cellFields: PivotCellField[]; exception: HoistException; }  // :78
export class View extends HoistBase implements FilterBindTarget, FilterValueSource, GridFilterBindTarget {   // :160
    @observableRef accessor query: Query;           // :171
    @observableRef accessor result: ViewResult;     // :177
    @observable accessor lastUpdated: number;       // :189
    @action updateQuery(overrides: Partial<QueryConfig>);   // :290
    getDimensionValues(): DimensionValue[];         // :321
    getField(name: string): CubeField;              // :335
    setStores(stores: Some<Store>);                 // :340
    createStore(config?: ViewStoreConfig): Store;   // :359 - store bound to this view
}

// ViewRowData.ts:17 - row shape published to stores
interface ViewRowData {
    id: string;
    cubeRowType: 'leaf' | 'aggregate' | 'bucket';
    cubeLabel: string;          // label for the row's dimension value
    cubeDimension: string;      // dimension name for this level
    cubeLabelValue: any;
    cubeBuckets: Record<string, any>;
    children: ViewRowData[];
    isCubeLeaf: boolean;
    cubeRowDigest: number;
    [key: string]: any;         // aggregated measure values by field name
}
```

Chart binding options: (a) bind to a `Store` (works for plain stores and for
`view.createStore()` / a cube grid's store); (b) bind to a `View` and read `view.result.rows`
reactively (`result` is observable). For a dimension-grouped chart, x = `cubeLabel` (or
`cubeLabelValue`) at depth N, y = measure field. Admin `AggChartModel.ts:163-213` does (a) by hand.

---

## 6. Dashboards - `desktop/cmp/dash/`

### DashViewSpec - `DashViewSpec.ts:16`

```ts
export interface DashViewSpec {
    id: string;
    content: Content;
    title?: string;
    icon?: ReactElement;
    groupName?: string;       // '/' nests, e.g. 'Charts/Line'
    omit?: Thunkable<boolean>;
    unique?: boolean;
    allowAdd?: boolean;       // default true
    allowRemove?: boolean;    // default true
    allowRename?: boolean;    // default true
    [x: string]: any;
}
// canvas/DashCanvasViewSpec.ts:16
export interface DashCanvasViewSpec extends DashViewSpec {
    height?: number;  width?: number;  maxHeight?: number;  minHeight?: number;
    maxWidth?: number;  minWidth?: number;
    hidePanelHeader?: boolean;  hideMenuButton?: boolean;  autoHeight?: boolean;  allowDuplicate?: boolean;
}
// container/DashContainerViewSpec.ts:13
export interface DashContainerViewSpec extends DashViewSpec {
    renderMode?: RenderMode;
    refreshMode?: RefreshMode;
}
```

### DashConfig base - `DashConfig.ts:16`

```ts
export interface DashConfig<VSPEC extends DashViewSpec, VSTATE extends DashViewState> {
    viewSpecs: VSPEC[];
    viewSpecDefaults?: Partial<VSPEC>;
    initialState?: SetOptional<VSTATE, 'id'>[];
    layoutLocked?: boolean;
    contentLocked?: boolean;
    renameLocked?: boolean;
    persistWith?: PersistOptions;
    emptyText?: string;
    addViewButtonText?: string;
    extraMenuItems?: MenuItemLike[];
    xhName?: string;
}
// DashModel.ts:14
export abstract class DashModel<VSPEC, VSTATE, VMODEL extends DashViewModel> extends HoistModel {
    viewSpecs: VSPEC[];
    @observableRef accessor state: VSTATE[];
    @managed @observableRef accessor viewModels: VMODEL[];
    @bindable accessor layoutLocked: boolean;  contentLocked: boolean;  renameLocked: boolean;
    protected genViewId(viewSpecId: string, existingIds?): string;   // `${viewSpecId}_${idx}`
}
```

### DashCanvasModel - `canvas/DashCanvasModel.ts`

```ts
export interface DashCanvasConfig extends DashConfig<DashCanvasViewSpec, DashCanvasItemState> {  // :47
    columns?: number;  rowHeight?: number;
    compact?: boolean | 'vertical' | 'horizontal' | 'wrap';
    margin?: [number, number];  containerPadding?: [number, number];
    maxRows?: number;  showGridBackground?: boolean;
    allowsDrop?: boolean;
    onDropDone?: (viewModel: DashCanvasViewModel) => void;
    onDropDragOver?: (e: DragEvent) => OnDropDragOverResult;
    showAddViewButtonWhenEmpty?: boolean;
}
export interface DashCanvasItemState {   // :105
    layout: DashCanvasItemLayout;
    title?: string;
    viewSpecId: string;
    state?: DashViewState;
}
export interface DashCanvasItemLayout { x: number; y: number; w: number; h: number; }   // :113

export class DashCanvasModel
    extends DashModel<DashCanvasViewSpec, DashCanvasItemState, DashCanvasViewModel>
    implements Persistable<{state: DashCanvasItemState[]}> {          // :135
    static defaults: DashCanvasModelDefaults;                         // :140
    @action clear();                                                  // :314
    @action restoreDefaults();                                        // :329
    @action addView(specId: string, opts?: {title?: string; position?: 'first' | 'last' | 'nextAvailable' | string;
        state?: any; width?: number; height?: number}): DashCanvasViewModel;   // :346
    @action loadState(state: DashCanvasItemState[]);                  // :507 - reuses view models by generated id
    getPersistableState(): PersistableState<{state: DashCanvasItemState[]}>;   // :556
    setPersistableState(persistableState: PersistableState<{state: DashCanvasItemState[]}>);  // :560
}
// provider: PersistenceProvider.create({persistOptions: {path: 'dashCanvas', settleTime: 1000, ...persistWith}, target: this})  :294-303
```

### DashContainerModel - `container/DashContainerModel.ts`

```ts
export interface DashContainerConfig extends DashConfig<DashContainerViewSpec, DashContainerViewState> {  // :54
    renderMode?: RenderMode;
    refreshMode?: RefreshMode;
    showMenuButton?: boolean;
    margin?: number;
    goldenLayoutSettings?: PlainObject;
}
export interface DashContainerViewState {   // :83
    type: 'row' | 'column' | 'stack' | 'view';
    id?: string;
    content?: DashContainerViewState[];
    title?: string;
    width?: number | string;
    height?: number | string;
    state?: PlainObject;
}
// implements Persistable<{state: DashContainerViewState[]}>  :416-423
// provider path 'dashContainer', settleTime 1000  :234-243
```

### DashViewModel - `DashViewModel.ts`

```ts
export type DashViewState = PlainObject;                              // :22

export abstract class DashViewModel<T extends DashViewSpec = DashViewSpec> extends HoistModel {  // :35
    id: string;
    viewSpec: T;
    containerModel: any;
    @bindable accessor title: string;                 // persisted
    @bindable accessor titleDetails: string;          // not persisted
    get fullTitle(): string;
    @bindableRef accessor icon: ReactElement;
    @bindableRef accessor viewState: DashViewState;   // :65 - widget state, persisted by parent
    @bindableRef accessor extraMenuItems: MenuItemLike[] = [];
    @managed refreshContextModel;
    @bindable accessor isActive: boolean;
    @action setViewState(viewState: DashViewState);   // :121 - also pushStateToTarget() on all providers
    setViewStateKey(key: string, value: any);         // :131
    registerProvider(provider: DashViewProvider<any>);     // :142 @internal
    unregisterProvider(provider: DashViewProvider<any>);   // :150 @internal
}
// canvas/DashCanvasViewModel.ts:18 - adds allowDuplicate, hidePanelHeader, hideMenuButton,
// autoHeight, @bindableRef headerItems: ReactNode[], ensureVisible()
```

### Widget persistence recipe (from `desktop/cmp/dash/README.md:535-570`)

```ts
class MyChartWidgetModel extends HoistModel {
    @lookup(() => DashViewModel) viewModel: DashViewModel;
    @managed chartModel: ChartModel;

    override onLinked() {
        super.onLinked();
        this.persistWith = {dashViewModel: this.viewModel};   // before markPersist
        this.markPersist('metric');
        this.chartModel = new ChartModel({persistWith: this.persistWith, ...});  // hypothetical V2
    }
}
```

### Persisted JSON shapes

DashCanvas (`buildState` `:646-658` + `viewState` getter `:660-671`):

```json
{"dashCanvas": {"state": [
  {"layout": {"x": 0, "y": 0, "w": 6, "h": 5}, "viewSpecId": "chart", "title": "Chart",
   "state": {"chart": {"...": "widget-owned keys"}, "metric": "hours"}}
]}}
```

DashContainer (`impl/DashContainerUtils.ts:35-77`):

```json
{"dashContainer": {"state": [
  {"type": "row", "allowRemove": true, "content": [
    {"type": "stack", "width": 40, "activeItemIndex": 0, "content": [
      {"type": "view", "id": "chart", "viewModelId": "chart_0", "title": "Renamed", "state": {"chart": {}}}
    ]}
  ]}
]}}
```

`title` written only when it differs from the spec title; `state` only when non-empty.

### Widget chooser

`DashCanvasWidgetChooser` (`canvas/widgetchooser/DashCanvasWidgetChooser.ts`) lists
`dashCanvasModel.viewSpecs` that allow add, grouped by `groupName`. Drag start sets
`dashCanvasModel.setDraggedInView({viewSpecId, layout: {x: 0, y: 0, w, h}})`
(`DashCanvasWidgetChooserModel.ts:27-47`). Requires `allowsDrop: true` on the canvas.

---

## 7. ViewManager - `cmp/viewmanager/ViewManagerModel.ts`

```ts
static async createAsync(config: ViewManagerConfig, ctx?: CallContextLike): Promise<ViewManagerModel>;  // :205
getValue(): Partial<T>;          // :503 - pendingValue ?? view.value
@action setValue(value: Partial<T>);   // :508 - cleanState, sets pendingValue if changed
registerProvider(provider: ViewManagerProvider<any>);   // :623
// ViewManagerConfig keys: type (required), typeDisplayName, globalDisplayName, enableAutoSave,
// enableDefault, enableGlobal, enableSharing, manageGlobal, initialViewSpec, instance,
// preserveUnsavedChanges, viewMenuItemFn, xhName
```

---

## 8. Format - `@xh/hoist/format`

```ts
export function fmtNumber(v: number, opts?: NumberFormatOptions): ReactNode;   // FormatNumber.ts:179
// returns a string when asHtml: true, or when no markup option (withSignGlyph, colorSpec, tooltip,
// ledger+forceLedgerAlign, label+labelCls) is set; else a React element.  :239-262
fmtThousands / fmtMillions / fmtBillions / fmtQuantity / fmtPrice / fmtPercent   // :266-365
export function fmtDate(v: DateLike, opts?: DateFormatOptions | string): ReactNode;  // FormatDate.ts:41
export const numberRenderer, numberTextRenderer;    // RenderNumber.ts:27, :42 - factories (opts) => renderer
export const dateRenderer, dateTextRenderer;        // RenderDate.ts:18, :28
```

Highcharts formatters need strings, so a bridge must call with `asHtml: true` (or use the
`*TextRenderer` factories).

---

## 9. TreeMapModel - closest existing data-bound chart (`cmp/treemap/TreeMapModel.ts`)

```ts
// TreeMapConfig keys (:20-96)
store?: Store;  gridModel?: GridModel;  maxNodes?: number;  maxLabels?: number;
highchartsConfig?: PlainObject;
labelField?: string;  valueField?: string;  heatField?: string;
valueRenderer?: TreeMapValueRendererFn;  heatRenderer?: TreeMapHeatRendererFn;
maxHeat?: number;  maxDepth?: number;  algorithm?: TreeMapAlgorithm;  colorMode?: TreeMapColorMode;
theme?: Theme;  onClick?;  onDoubleClick?;  tooltip?: boolean | TreeMapTooltipFn;
emptyText?: ReactNode;  filter?: FilterLike;  xhName?: string;
// store defaults to gridModel.store (:190); selection and expand state read from gridModel (:269-277);
// field labels from store.getField(name).displayName (:257-267). No persistence.
```

---

## 10. Conventions a Chart V2 API must follow

Sources: `CLAUDE.md`, `docs/coding-conventions.md`. `AGENTS.md` only points to `CLAUDE.md`.

| Rule | Detail | Ref |
|---|---|---|
| Config interfaces | `interface` for object shapes, `type` for unions. Suffixes: `*Config` (ctor), `*Props` (component), `*Spec` (declarative object), `*Options` (param bundle). No `I` prefix. | `coding-conventions.md:226-243`, `:295-324` |
| Export config types | Public configs are exported (`GridConfig`, `DashCanvasConfig`). Today's `ChartConfig` is not - fix. | - |
| `declare config` | First member: `declare config: FooConfig;` to narrow `HoistModel.config`. | `coding-conventions.md:272-283` |
| Observables | TC39 decorators with `accessor`: `@observable accessor`, `@bindable accessor x = null`. Ref variants `@observableRef`, `@bindableRef`. `@computed` getters. No `makeObservable`. | `CLAUDE.md` "MobX Integration" |
| Setters | Explicit public `setFoo()` only when it adds logic; otherwise assign `model.foo = v`. | `CLAUDE.md` |
| Lifecycle | `@managed` on child `HoistBase` instances (stores, views, chooser models). `addReaction` / `addAutorun` for subscriptions. `override` keyword required. | `CLAUDE.md`, `coding-conventions.md:260-270` |
| `readonly` | For props set once in ctor. | `coding-conventions.md:285-293` |
| Member order | statics, `declare config`, readonly, `@managed`, observables, computeds, ctor, lifecycle hooks, public methods, private. Section dividers `//-----`. | `coding-conventions.md:376-432` |
| Constructor | `super()`, destructure config with defaults (`= Foo.defaults.x`), assign. | `coding-conventions.md:434-447` |
| App defaults | `static defaults: FooModelDefaults` (v83 pattern). Instance config wins. | `CHANGELOG.md:2052`, `GridModel.ts:518` |
| Factories | `[Cmp, cmp] = hoistCmp.withFactory<Props>({...})` for library components. Element factories over JSX. Inside render: `children` in, `items` out. | `CLAUDE.md`, `coding-conventions.md:459-593` |
| Named exports only | No default exports. | `coding-conventions.md:569-580` |
| Null | `null` not `undefined` as sentinel. Test with `== null`. Never write `\| null` / `\| undefined` in types. | `coding-conventions.md:611-650` |
| Async | `Async` suffix for promise-returning methods. Use `this.runner(...)` chain for load/masking. | `CLAUDE.md`, `coding-conventions.md:766-853` |
| Errors | `throwIf()`, `XH.handleException()`, `logWarn` for soft failures (e.g. unknown id in persisted state). | `coding-conventions.md:855-910` |
| Lodash first | Use lodash / `@xh/hoist/utils` for compare, group, merge, dedupe. | `CLAUDE.md` |
| Match existing pattern | Mirror GridModel/DashModel siblings; do not special-case one member. | `CLAUDE.md` |
| Escape hatch naming | Vendor passthrough as `agOptions`-style key on the child spec plus a top-level config. | `Column.ts:459`, `Grid.ts:81` |
| `appData` | Strict ctor, unknown keys throw, custom data in `appData`. | `GridModel.ts:858-864` |
| CSS | `xh-` prefix, BEM (`xh-chart__tooltip`), CSS vars `--xh-*`. | `coding-conventions.md:988-1032` |
| Comments | TSDoc on public API. Spaced hyphen, never em dash. Describe code as it is. | `CLAUDE.md` |
| Platform | Shared code in `cmp/`; desktop-only bits (context menu, chooser UI) behind `XH.isDesktop` or in `desktop/`. | `CLAUDE.md`, `ChartModel.ts:141`, `Chart.ts:88-89` |
| Vendor types | Do not import Highcharts in the library (licensing). Hoist-owned types only. | issue #3726 |
| Tests | Specs beside code (`Foo.spec.ts`), boot with `initTestAppAsync()`, no `vi.mock` of Hoist modules. | `CLAUDE.md`, `docs/unit-testing.md` |
