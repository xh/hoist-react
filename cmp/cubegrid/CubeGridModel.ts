/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {
    ColumnGroupShowMode,
    ColumnGroupSpec,
    ColumnSpec,
    GridConfig,
    GridEnsureVisibleOptions,
    GridLikeModel,
    GridModelPersistOptions,
    GridSelectFirstOptions,
    GridSelectOptions
} from '@xh/hoist/cmp/grid';
import {GridModel} from '@xh/hoist/cmp/grid';
import {initPersist} from '@xh/hoist/cmp/grid/impl/InitPersist';
import type {Awaitable, HAlign, HSide, ReactionSpec, Some, VSide} from '@xh/hoist/core';
import {HoistModel, managed} from '@xh/hoist/core';
import type {
    Cube,
    CubeField,
    PivotCellField,
    PivotPath,
    QueryConfig,
    Store,
    StoreRecordOrId,
    View
} from '@xh/hoist/data';
import {action, bindable, bindableRef, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {
    castArray,
    isArray,
    isEmpty,
    isEqual,
    isFunction,
    keyBy,
    mapValues,
    omit,
    orderBy,
    pick,
    sortBy
} from 'lodash';
import type {
    PivotColumnGroupContext,
    PivotColumnGroupSpec,
    PivotSort,
    PivotColumnContext,
    PivotColumnSpec
} from './Types';
import {RESERVED_PIVOT_COLUMN_GROUP_KEYS, RESERVED_PIVOT_COLUMN_KEYS} from './Types';

/**
 * Configuration for a {@link CubeGridModel}.
 *
 * Supply the data as either an existing `view` or a `cube` with a `query`. Query configuration -
 * `dimensions`, `pivot`, `includeRoot` and the rest - lives on the {@link Query}, and apps
 * reconfigure by calling `view.updateQuery()`. Everything else here is presentational.
 *
 * @see CubeGridModel
 */
export interface CubeGridConfig {
    /**
     * View supplying this grid's data. Owned by the *application* - this model neither manages nor
     * destroys it, and cannot swap it after construction. Two CubeGridModels may bind to one view;
     * each mints its own Store. Omit to create a view from `cube` and `query` instead.
     */
    view?: View;

    /** Cube to query, when no `view` is supplied. The model creates and owns a connected View. */
    cube?: Cube;

    /** Query for the view this model creates from `cube`. Ignored when `view` is supplied. */
    query?: QueryConfig;

    /**
     * Columns for the fixed region, as on {@link GridConfig.columns}. Bind them to the view's
     * fields - a value field's bare name is the row total, whether or not the query pivots. When
     * none is a tree column, a label column for the row dimensions is placed first. Pivot columns,
     * if any, follow this region.
     */
    columns?: Array<ColumnSpec | ColumnGroupSpec>;

    /**
     * Column config per measure, applied to every pivot column built for it under every path -
     * renderer, width, align, and so on. Each entry's `field` names a `pivot.valueFields` entry,
     * and their order here is the order of the columns within each path group. A measure
     * without an entry gets a default column.
     *
     * Specs are expected to be shared with the fixed `columns`, so {@link RESERVED_PIVOT_COLUMN_KEYS}
     * are stripped rather than rejected. Pivot columns are not hideable and stay out of the column
     * chooser - the region is the query's, so drop a field from `pivot.valueFields` to remove its
     * columns.
     */
    pivotColumns?: PivotColumnSpec[];

    /**
     * Overrides for one pivot column, merged over its `pivotColumns` entry - a class on the
     * `total` columns, a width keyed on the path, and so on. Called per column on every rebuild.
     * Return null for none. Reserved keys are stripped as for `pivotColumns`.
     */
    pivotColumnSpecFn?: (ctx: PivotColumnContext) => PivotColumnSpec;

    /**
     * Overrides for one pivot column group, merged over the built group - a header class or
     * alignment on the `total` groups, a header name keyed on the path, and so on. Called per
     * group on every rebuild. Return null for none. {@link RESERVED_PIVOT_COLUMN_GROUP_KEYS} are
     * stripped.
     */
    pivotColumnGroupSpecFn?: (ctx: PivotColumnGroupContext) => PivotColumnGroupSpec;

    /** Display sort per pivot dimension, outermost first. Unspecified levels keep view order. */
    pivotSortBy?: PivotSort[];

    /**
     * Summary columns while a pivot group is expanded, as {@link GridConfig.showSummary} is the
     * summary row: a column per value field under a `Total` header, holding the pivot region's
     * row totals and each parent pivot group's subtotals. A collapsed group always shows its
     * summary. True for the default 'left', where the summary keeps its collapsed position and
     * the group opens to its right, or an {@link HSide} to place it within the group. Default
     * false. Bind this rather than expecting the column chooser to restore it.
     *
     * Summary cells and headers carry the `xh-cube-grid__total-cell` and
     * `xh-cube-grid__total-header` classes, unstyled, for apps that want to set them apart.
     */
    showPivotSummaries?: boolean | HSide;

    /**
     * True (default) to let the pivot region and each parent pivot group collapse from its header
     * to its summary columns. False to fix every group open, with summary columns only where
     * `showPivotSummaries` asks for them.
     */
    pivotGroupsCollapsible?: boolean;

    /**
     * Pivot header level to expand to on initial load, as {@link GridConfig.expandLevel} is for
     * rows. 0 collapses the region to the row summary, 1 shows the top-level pivot groups
     * collapsed to theirs, and so on. Default -1, all levels expanded. Initial state only -
     * thereafter {@link GridModel.columnGroupState} tracks each group, keyed on its path, and
     * persists it with `gridConfig.persistWith`. See {@link CubeGridModel.expandPivotToLevel}.
     */
    pivotExpandLevel?: number;

    /**
     * Config for the underlying GridModel. `store`, `treeMode` and `columns` are managed by this
     * model and cannot be set here; everything else is a default this config overrides. A
     * `showSummary` row needs `includeRoot` on the query, which is what produces it. `persistWith`
     * attaches once the pivot columns exist, so saved state can name them.
     */
    gridConfig?: Omit<GridConfig, 'store' | 'treeMode' | 'columns'>;
}

/**
 * Grid presentation of a Cube {@link View} - a tree grid of group rows with the app's own columns,
 * and when the query sets {@link QueryConfig.pivot}, a column group per pivot path appended to
 * their right, with optional docked summaries.
 *
 * Owns everything downstream of the view: the Store, the {@link GridModel} and the column
 * hierarchy, rebuilt when `result.paths` changes identity. Owns the view too when created from
 * `cube` and `query`.
 *
 * @see CubeGridConfig
 * @mcpHint tree grid on a Cube view - app columns, plus pivot paths as column groups when pivoted
 */
export class CubeGridModel extends HoistModel implements GridLikeModel {
    /** View supplying this grid's data. Not swappable. */
    readonly view: View;

    /** Pivot header level last expanded to, or -1 for all. Set via {@link expandPivotToLevel}. */
    @observable accessor pivotExpandLevel: number;

    @bindableRef accessor columns: Array<ColumnSpec | ColumnGroupSpec>;
    @bindableRef accessor pivotColumns: PivotColumnSpec[];
    @bindableRef accessor pivotColumnSpecFn: (ctx: PivotColumnContext) => PivotColumnSpec;
    @bindableRef accessor pivotColumnGroupSpecFn: (
        ctx: PivotColumnGroupContext
    ) => PivotColumnGroupSpec;
    @bindableRef accessor pivotSortBy: PivotSort[];
    @bindable accessor showPivotSummaries: boolean | HSide;
    @bindable accessor pivotGroupsCollapsible: boolean;

    //------------------------
    // Child Models
    //------------------------

    /** Store projecting the view's rows. Owned here - GridModel never manages a store instance. */
    @managed readonly store: Store;
    @managed readonly gridModel: GridModel;

    constructor({
        view,
        cube,
        query,
        columns = [],
        pivotColumns = [],
        pivotColumnSpecFn = null,
        pivotColumnGroupSpecFn = null,
        pivotSortBy = [],
        showPivotSummaries = false,
        pivotGroupsCollapsible = true,
        pivotExpandLevel = -1,
        gridConfig
    }: CubeGridConfig) {
        super();

        throwIf(
            !view && !cube,
            'CubeGridModel requires either a `view` or a `cube` with a `query`.'
        );
        throwIf(view && cube, 'Specify either `view` or `cube` for a CubeGridModel, not both.');
        this.view = view ?? this.markManaged(cube.createView({query, connect: true}));

        this.columns = columns;
        this.pivotColumns = pivotColumns;
        this.pivotColumnSpecFn = pivotColumnSpecFn;
        this.pivotColumnGroupSpecFn = pivotColumnGroupSpecFn;
        this.pivotSortBy = pivotSortBy;
        this.showPivotSummaries = showPivotSummaries;
        this.pivotGroupsCollapsible = pivotGroupsCollapsible;
        this.pivotExpandLevel = pivotExpandLevel;

        this.store = this.view.createStore({connect: true});
        const {persistWith, ...restGridConfig} = gridConfig ?? {};
        this.gridModel = this.createGridModel(restGridConfig);

        this._pendingPersistWith = persistWith;
        this.initPersistWhenReady();

        this.addReaction(this.columnsReaction(), this.regionsReaction());
    }

    //------------------------
    // Selection and state - delegated to the GridModel, as in ZoneGridModel
    //------------------------

    get innerGridModel(): GridModel {
        return this.gridModel;
    }

    get empty() {
        return this.gridModel.empty;
    }

    /** The grid's summary row, as {@link GridModel.showSummary}. Needs `includeRoot` on the query. */
    get showSummary(): boolean | VSide {
        return this.gridModel.showSummary;
    }

    setShowSummary(v: boolean | VSide) {
        this.gridModel.showSummary = v;
    }

    /**
     * Expand the pivot column groups to the given level, or all for -1, as
     * {@link GridModel.expandToLevel} does for rows. The region is level 0 and each path group
     * the level of its depth. Later rebuilds mint new groups at this level too.
     */
    @action
    expandPivotToLevel(level: number) {
        this.pivotExpandLevel = level;
        const {gridModel, _pivotGroupLevels} = this;
        gridModel.setColumnGroupState(
            gridModel.columnGroupState.map(it =>
                _pivotGroupLevels.has(it.groupId)
                    ? {
                          ...it,
                          expanded: this.isPivotLevelExpanded(_pivotGroupLevels.get(it.groupId))
                      }
                    : it
            )
        );
    }

    expandAllPivotGroups() {
        this.expandPivotToLevel(-1);
    }

    collapseAllPivotGroups() {
        this.expandPivotToLevel(0);
    }

    get selModel() {
        return this.gridModel.selModel;
    }

    get hasSelection() {
        return this.gridModel.hasSelection;
    }

    get selectedRecords() {
        return this.gridModel.selectedRecords;
    }

    get selectedRecord() {
        return this.gridModel.selectedRecord;
    }

    get selectedId() {
        return this.gridModel.selectedId;
    }

    selectAsync(records: Some<StoreRecordOrId>, opts?: GridSelectOptions) {
        return this.gridModel.selectAsync(records, opts);
    }

    preSelectFirstAsync() {
        return this.gridModel.preSelectFirstAsync();
    }

    selectFirstAsync(opts?: GridSelectFirstOptions) {
        return this.gridModel.selectFirstAsync(opts);
    }

    ensureSelectionVisibleAsync(opts?: GridEnsureVisibleOptions) {
        return this.gridModel.ensureSelectionVisibleAsync(opts);
    }

    //------------------------
    // Implementation
    //------------------------

    private get query() {
        return this.view.query;
    }

    // Measures in `pivotColumns` order, then any the app left unconfigured in query order.
    private get valueFields(): CubeField[] {
        const fields = this.query.pivot?.valueFields ?? [],
            listed = this.pivotColumns.map(it => it.field);
        return sortBy(fields, it => {
            const idx = listed.indexOf(it.name);
            return idx === -1 ? listed.length : idx;
        });
    }

    private get pivotSummarySide(): HSide {
        return resolveSide(this.showPivotSummaries, 'left');
    }

    // `equals: 'shallow'` - the track fn allocates a fresh array per run.
    private columnsReaction(): ReactionSpec {
        return {
            equals: 'shallow',
            track: () => [
                this.view.result.paths,
                this.columns,
                this.showPivotSummaries,
                this.pivotGroupsCollapsible,
                this.pivotSortBy,
                this.pivotColumns,
                this.pivotColumnSpecFn,
                this.pivotColumnGroupSpecFn
            ],
            run: () => this.rebuildColumns()
        };
    }

    private createGridModel(config: CubeGridConfig['gridConfig']): GridModel {
        return new GridModel({
            emptyText: 'No data',
            colChooserModel: true,
            stripeRows: true,
            rowBorders: true,
            ...config,
            store: this.store,
            treeMode: true,
            columns: this.buildColumns(),
            restoreDefaultsFn: () => this.restoreDefaultsAsync(config.restoreDefaultsFn)
        });
    }

    // The GridModel's defaults hold the columns it was built with, before the view had paths or
    // at paths since gone. A restore rebuilds the pivot region at the current paths, state and
    // all, then sizes it as the GridModel sized its own defaults.
    private async restoreDefaultsAsync(appFn: () => Awaitable<void>) {
        const {gridModel} = this;
        gridModel.setColumns(this.buildColumns());
        if (gridModel.autosizeOptions.mode === 'managed') await gridModel.autosizeAsync();
        await appFn?.();
    }

    // `setColumns` resets column and group state. Cell field names and path keys are stable ids,
    // so prior state carries over: fixed columns keep their order, and pivot columns keep their
    // width but take the order of the build, since that order is the view's, not the user's. Any
    // fixed column dragged into the pivot region returns to its own.
    @action
    private rebuildColumns() {
        const {gridModel, _pivotColIds} = this,
            {columnState: prior, columnGroupState} = gridModel,
            priorById = keyBy(prior, 'colId');

        gridModel.setColumns(this.buildColumns());

        const fixed = prior.filter(it => !_pivotColIds.has(it.colId)),
            pivot = gridModel.columnState
                .filter(it => _pivotColIds.has(it.colId))
                .map(it => ({
                    ...it,
                    ...pick(priorById[it.colId], 'width', 'manuallySized')
                }));

        gridModel.setColumnState([...fixed, ...pivot]);
        gridModel.setColumnGroupState(columnGroupState);
        this.initPersistWhenReady();
    }

    // The column chooser's own drag knows nothing of ag-Grid's position lock, so a fixed column
    // dropped among the pivot columns there is put back as soon as the state lands.
    private regionsReaction(): ReactionSpec {
        return {
            track: () => this.gridModel.columnState,
            run: () => this.enforceRegions()
        };
    }

    @action
    private enforceRegions() {
        const {gridModel, _pivotColIds} = this,
            {columnState} = gridModel,
            ordered = [
                ...columnState.filter(it => !_pivotColIds.has(it.colId)),
                ...columnState.filter(it => _pivotColIds.has(it.colId))
            ];
        if (!isEqual(ordered, columnState)) gridModel.setColumnState(ordered);
    }

    // Persisted state names pivot columns, which exist only once a pivoted view has paths.
    // Attaching earlier would restore and rewrite that state without them.
    private initPersistWhenReady() {
        const persistWith = this._pendingPersistWith;
        if (!persistWith || (this.query.isPivoted && isEmpty(this.view.result.paths))) return;
        initPersist(this.gridModel, persistWith);
        this._pendingPersistWith = null;
    }

    private buildColumns(): Array<ColumnSpec | ColumnGroupSpec> {
        const {paths, cellFields} = this.view.result;

        this.indexCellFields(cellFields);

        // Stripped once per rebuild.
        this.pivotColumns.forEach(it =>
            throwIf(!it.field, 'Each `pivotColumns` entry must name a value field in `field`.')
        );
        this._pivotColumnsByField = mapValues(keyBy(this.pivotColumns, 'field'), it =>
            omit(it, RESERVED_PIVOT_COLUMN_KEYS)
        );

        const fixed = this.buildFixedColumns();
        this._pivotColIds = new Set();
        this._pivotGroupLevels = new Map();
        if (!this.query.isPivoted || isEmpty(paths)) return fixed;

        // One group over the whole region, titled by the pivot dimensions, collapses to the row
        // summaries.
        const pathCols = this.sortPaths(paths, 0).map(path => this.buildPathColumn(path, [])),
            pivotGroup = this.buildColGroup(
                PIVOT_GROUP_ID,
                this.query.pivot.dimensions.map(it => it.displayName).join(' › '),
                this.buildGroupChildren(pathCols, this._rootPath),
                {level: 0, ctx: {path: this._rootPath, kind: 'path'}}
            );

        this._pivotColIds = new Set(leafColIds([pivotGroup]));
        return [...fixed, pivotGroup];
    }

    // The app's columns, with a default label column first unless the app supplied a tree column.
    private buildFixedColumns(): Array<ColumnSpec | ColumnGroupSpec> {
        const {columns} = this,
            hasTreeCol = columns.some(it => 'isTreeColumn' in it && it.isTreeColumn);
        return hasTreeCol ? columns : [this.buildLabelColumn(), ...columns];
    }

    // Keyed on path identity.
    private indexCellFields(cellFields: PivotCellField[]) {
        const byPath = new Map<PivotPath, Map<string, string>>();
        let rootPath: PivotPath = null;

        cellFields.forEach(({name, path, valueField}) => {
            if (path.isRoot) rootPath = path;
            let byField = byPath.get(path);
            if (!byField) byPath.set(path, (byField = new Map()));
            byField.set(valueField.name, name);
        });

        this._cellFieldNames = byPath;
        this._rootPath = rootPath;
    }

    private buildLabelColumn(): ColumnSpec {
        return {
            field: 'cubeLabel',
            isTreeColumn: true,
            pinned: 'left',
            headerName: () => this.query.dimensions.map(it => it.displayName).join(' › '),
            // Sort on the raw value behind the stringified label. A field, not a function, so
            // `GridTransactionManager` can prove a tick leaves row order alone.
            sortValue: 'cubeLabelValue',
            renderer: v => (isEmpty(v) || v === 'null' ? '(empty)' : v)
        };
    }

    // The tooltip carries the full path, as an ancestor's header is often scrolled out of view.
    private buildPathColumn(
        path: PivotPath,
        ancestorLabels: string[]
    ): ColumnSpec | ColumnGroupSpec {
        const labels = [...ancestorLabels, path.label],
            headerTooltip = labels.join(' › ');

        // Always a group, so the measure name stays visible beside any fixed columns.
        if (isEmpty(path.children)) {
            return this.buildColGroup(path.key, path.label, this.buildValueColumns(path), {
                level: path.depth,
                headerAlign: 'center',
                headerTooltip,
                ctx: {path, kind: 'path'}
            });
        }

        const childCols = this.sortPaths(path.children, path.depth).map(child =>
            this.buildPathColumn(child, labels)
        );
        return this.buildColGroup(path.key, path.label, this.buildGroupChildren(childCols, path), {
            level: path.depth,
            headerTooltip,
            ctx: {path, kind: 'path'}
        });
    }

    // Children of a group that collapses to its summary. The path groups show expanded. The
    // summary sits under a Total header, always when asked and otherwise only while collapsed,
    // so collapsing a group never changes the header depth. With collapsing off there is only
    // the Total group, only when asked.
    private buildGroupChildren(
        pathCols: Array<ColumnSpec | ColumnGroupSpec>,
        summaryPath: PivotPath
    ): Array<ColumnSpec | ColumnGroupSpec> {
        const {pivotGroupsCollapsible, pivotSummarySide: summarySide} = this;
        if (!summarySide && !pivotGroupsCollapsible) return pathCols;

        const children = pivotGroupsCollapsible
                ? pathCols.map(it => ({...it, groupShowMode: 'expanded' as const}))
                : pathCols,
            group = this.buildColGroup(
                `${summaryPath.isRoot ? PIVOT_GROUP_ID : summaryPath.key}:total`,
                'Total',
                this.buildSummaryColumns(summaryPath),
                {
                    headerAlign: 'center',
                    groupShowMode: summarySide ? null : 'collapsed',
                    ctx: {path: summaryPath, kind: 'total'}
                }
            ),
            total = {...group, headerClass: withClass(group.headerClass, TOTAL_HEADER_CLASS)};

        return summarySide === 'left' ? [total, ...children] : [...children, total];
    }

    // Row summaries are the pivot summaries at the root path - the same cells at different depths.
    // A summary column binds the path's own cell but takes a colId of its own, so the root summary
    // never collides with a fixed column bound to the same measure. All carry the total classes,
    // over any the app adds.
    private buildSummaryColumns(path: PivotPath): ColumnSpec[] {
        return this.buildValueColumns(path, 'total').map(col => ({
            ...col,
            colId: `total>>${col.colId}`,
            cellClass: withClass(col.cellClass, TOTAL_CELL_CLASS),
            headerClass: withClass(col.headerClass, TOTAL_HEADER_CLASS)
        }));
    }

    private buildValueColumns(
        path: PivotPath,
        kind: PivotColumnContext['kind'] = 'cell'
    ): ColumnSpec[] {
        return this.valueFields.map(field => this.buildValueColumn(path, field, kind));
    }

    // The pivot region is the query's: these columns never move or hide, and the chooser does not
    // list them. Field names are built from data values that may contain dots.
    private buildValueColumn(
        path: PivotPath,
        field: CubeField,
        kind: PivotColumnContext['kind']
    ): ColumnSpec {
        const name = this.cellFieldName(path, field),
            spec = this._pivotColumnsByField[field.name] ?? {},
            overrides = this.pivotColumnSpecFn?.({path, field, kind, spec});
        return {
            ...spec,
            ...(overrides ? omit(overrides, RESERVED_PIVOT_COLUMN_KEYS) : null),
            colId: name,
            field: name,
            movable: false,
            hideable: false,
            excludeFromChooser: true,
            enableDotSeparatedFieldPath: false,
            // Keeps the pivot block trailing: a fixed column cannot be dropped inside it.
            agOptions: {lockPosition: 'right'}
        };
    }

    // A group with a `level` is a pivot group that expands and collapses. Wide groups are
    // left-aligned, as a centered label on one sits out of the viewport.
    private buildColGroup(
        groupId: string,
        headerName: string,
        children: Array<ColumnSpec | ColumnGroupSpec>,
        {
            level,
            headerAlign = 'left',
            groupShowMode,
            headerTooltip,
            ctx
        }: {
            level?: number;
            headerAlign?: HAlign;
            groupShowMode?: ColumnGroupShowMode;
            headerTooltip?: string;
            ctx: Pick<PivotColumnGroupContext, 'path' | 'kind'>;
        }
    ): ColumnGroupSpec {
        const isPivotLevel = level != null,
            spec: PivotColumnGroupSpec = {headerName, headerAlign, headerTooltip},
            overrides = this.pivotColumnGroupSpecFn?.({...ctx, spec});
        if (isPivotLevel) this._pivotGroupLevels.set(groupId, level);
        return {
            ...spec,
            ...(overrides ? omit(overrides, RESERVED_PIVOT_COLUMN_GROUP_KEYS) : null),
            groupId,
            children,
            groupShowMode,
            collapsed:
                isPivotLevel && this.pivotGroupsCollapsible && !this.isPivotLevelExpanded(level)
        };
    }

    private isPivotLevelExpanded(level: number): boolean {
        const {pivotExpandLevel} = this;
        return pivotExpandLevel < 0 || level < pivotExpandLevel;
    }

    // Display only - `result.paths` is immutable.
    private sortPaths(paths: PivotPath[], depth: number): PivotPath[] {
        const spec = this.pivotSortBy[depth] ?? null;

        if (spec === 'asc' || spec === 'desc') return orderBy(paths, 'value', spec);

        if (isArray(spec)) {
            // One shared key for the unlisted, so the stable sort leaves them in view order.
            return sortBy(paths, it => {
                const idx = spec.indexOf(it.value);
                return idx === -1 ? spec.length : idx;
            });
        }

        return paths;
    }

    // Falls back to the value field's own name, which is exactly the root-path cell field.
    private cellFieldName(path: PivotPath, field: CubeField): string {
        return this._cellFieldNames.get(path)?.get(field.name) ?? field.name;
    }

    private _cellFieldNames: Map<PivotPath, Map<string, string>> = new Map();
    private _rootPath: PivotPath = null;
    private _pivotColumnsByField: Record<string, PivotColumnSpec> = {};
    private _pendingPersistWith: GridModelPersistOptions = null;
    private _pivotColIds: Set<string> = new Set();
    private _pivotGroupLevels: Map<string, number> = new Map();

    override destroy() {
        // The view registered this store rather than owning it, and outlives any grid bound to it.
        this.view?.disconnectStore(this.store);
        super.destroy();
    }
}

/** Group id of the column group spanning the pivot region. Its summary group is `pivot:total`. */
export const PIVOT_GROUP_ID = 'pivot';

const TOTAL_CELL_CLASS = 'xh-cube-grid__total-cell',
    TOTAL_HEADER_CLASS = 'xh-cube-grid__total-header';

// Prepends a class to a class spec, wrapping a class function.
function withClass<T extends (...args: any[]) => Some<string>>(
    spec: T | Some<string>,
    cls: string
): T | string[] {
    return isFunction(spec)
        ? (((...args) => [cls, ...castArray(spec(...args) ?? [])]) as T)
        : [cls, ...castArray(spec ?? [])];
}

function leafColIds(cols: Array<ColumnSpec | ColumnGroupSpec>): string[] {
    return cols.flatMap(it => ('children' in it ? leafColIds(it.children) : it.colId));
}

function resolveSide<T extends HSide | VSide>(val: boolean | T, dflt: T): T {
    if (val === true) return dflt;
    return val === false ? null : val;
}
