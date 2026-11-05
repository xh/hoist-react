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
import type {HAlign, HSide, ReactionSpec, Some, VSide} from '@xh/hoist/core';
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
import {isArray, isEmpty, isEqual, keyBy, mapValues, omit, orderBy, pick, sortBy} from 'lodash';

/**
 * Display sort for the pivot values at one level of the path tree.
 *
 * `'asc'` / `'desc'` sort by raw dimension value. An array is an explicit ordering of raw dimension
 * values, with anything unlisted following in the view's own ascending order. `null` leaves the level
 * in that view order.
 */
export type PivotSort = 'asc' | 'desc' | any[];

/**
 * {@link ColumnSpec} keys managed by {@link CubeGridModel} and stripped from any
 * {@link CubeGridConfig.pivotValueSpecs} entry - column identity is derived from the pivot path,
 * and the rest are reserved for this model's own use.
 */
export const RESERVED_PIVOT_VALUE_KEYS = [
    'colId',
    'field',
    'isTreeColumn',
    'hidden',
    'enableDotSeparatedFieldPath',
    'omit',
    'pinned',
    'editable',
    'editor',
    'setValueFn',
    'getValueFn',
    'sortValue',
    'agOptions'
] as const;

/**
 * Config for a pivot value column. {@link RESERVED_PIVOT_VALUE_KEYS} are an error to write
 * inline, but a shared spec carrying them assigns cleanly and they are stripped.
 */
export type PivotValueSpec = Omit<ColumnSpec, (typeof RESERVED_PIVOT_VALUE_KEYS)[number]>;

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
     * Column config applied to every pivot column built for the named value field - renderer,
     * width, align, and so on. Keyed by value field name.
     *
     * Specs are expected to be shared with the fixed `columns`, so {@link RESERVED_PIVOT_VALUE_KEYS}
     * are stripped rather than rejected. Pivot columns are hideable like any other - set
     * `hideable: false` here to lock a measure's columns, and drop the field from the query's
     * `pivot.valueFields` to remove them.
     */
    pivotValueSpecs?: Record<string, PivotValueSpec>;

    /** Display sort per pivot dimension, outermost first. Unspecified levels keep view order. */
    pivotSortBy?: PivotSort[];

    /**
     * Summary columns while a pivot group is expanded, as {@link GridConfig.showSummary} is the
     * summary row: a column per value field under a `Total` header, holding the pivot region's
     * row totals and each parent pivot group's subtotals. A collapsed group always shows its
     * summary. True for the default 'right', or an {@link HSide} to place it within the group.
     * Default false. Bind this rather than expecting the column chooser to restore it.
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
    @bindableRef accessor pivotValueSpecs: Record<string, PivotValueSpec>;
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
        pivotValueSpecs = {},
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
        this.pivotValueSpecs = pivotValueSpecs;
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

    private get valueFields(): CubeField[] {
        return this.query.pivot?.valueFields ?? [];
    }

    private get pivotSummarySide(): HSide {
        return resolveSide(this.showPivotSummaries, 'right');
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
                this.pivotValueSpecs
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
            columns: this.buildColumns()
        });
    }

    // `setColumns` resets column and group state. Cell field names and path keys are stable ids,
    // so prior state carries over: fixed columns keep their order, and pivot columns keep their
    // width and hidden flag but take the order of the build, since that order is the view's, not
    // the user's. Any fixed column dragged into the pivot region returns to its own.
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
                    ...pick(priorById[it.colId], 'width', 'hidden', 'manuallySized')
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
        this._valueSpecs = mapValues(this.pivotValueSpecs, it =>
            omit(it, RESERVED_PIVOT_VALUE_KEYS)
        );

        const fixed = this.buildFixedColumns();
        this._pivotColIds = new Set();
        this._pivotGroupLevels = new Map();
        if (!this.query.isPivoted || isEmpty(paths)) return fixed;

        // One group over the whole region, titled by the pivot dimensions, collapses to the row
        // summaries.
        const pathCols = this.sortPaths(paths, 0).map(path => this.buildPathColumn(path)),
            pivotGroup = this.buildColGroup(
                PIVOT_GROUP_ID,
                this.query.pivot.dimensions.map(it => it.displayName).join(' › '),
                this.buildGroupChildren(pathCols, this._rootPath),
                {level: 0}
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

    private buildPathColumn(path: PivotPath): ColumnSpec | ColumnGroupSpec {
        // Always a group, so the measure name stays visible beside any fixed columns.
        if (isEmpty(path.children)) {
            return this.buildColGroup(path.key, path.label, this.buildValueColumns(path), {
                level: path.depth,
                headerAlign: 'center'
            });
        }

        const childCols = this.sortPaths(path.children, path.depth).map(child =>
            this.buildPathColumn(child)
        );
        return this.buildColGroup(path.key, path.label, this.buildGroupChildren(childCols, path), {
            level: path.depth
        });
    }

    // Children of a group that collapses to its summary. The path groups show expanded. The
    // summary shows while expanded under a Total header, when asked, and while collapsed as bare
    // columns under the group's own label, as ag-Grid does. With collapsing off there is only the
    // Total group, only when asked.
    private buildGroupChildren(
        pathCols: Array<ColumnSpec | ColumnGroupSpec>,
        summaryPath: PivotPath
    ): Array<ColumnSpec | ColumnGroupSpec> {
        const {pivotGroupsCollapsible, pivotSummarySide: summarySide} = this,
            children = pivotGroupsCollapsible
                ? pathCols.map(it => ({...it, groupShowMode: 'expanded' as const}))
                : pathCols,
            summaryCols: Array<ColumnSpec | ColumnGroupSpec> = [];

        if (summarySide) {
            summaryCols.push(
                this.buildColGroup(
                    `${summaryPath.isRoot ? PIVOT_GROUP_ID : summaryPath.key}:total`,
                    'Total',
                    this.buildSummaryColumns(summaryPath, 'total'),
                    {
                        headerAlign: 'center',
                        groupShowMode: pivotGroupsCollapsible ? 'expanded' : null
                    }
                )
            );
        }
        if (pivotGroupsCollapsible) {
            summaryCols.push(...this.buildSummaryColumns(summaryPath, 'collapsed'));
        }

        return summarySide === 'left'
            ? [...summaryCols, ...children]
            : [...children, ...summaryCols];
    }

    // Row summaries are the pivot summaries at the root path - the same cells at different depths.
    // A summary column binds the path's own cell but takes a colId of its own, so the root summary
    // never collides with a fixed column bound to the same measure. The `collapsed` set stands in
    // for the `total` set while its group is collapsed, so it stays out of the chooser.
    private buildSummaryColumns(path: PivotPath, kind: 'total' | 'collapsed'): ColumnSpec[] {
        const collapsed = kind === 'collapsed';
        return this.buildValueColumns(path).map(col => ({
            ...col,
            colId: `${kind}>>${col.colId}`,
            groupShowMode: collapsed ? 'collapsed' : null,
            excludeFromChooser: collapsed
        }));
    }

    private buildValueColumns(path: PivotPath): ColumnSpec[] {
        return this.valueFields.map(field => this.buildValueColumn(path, field));
    }

    // Order within the pivot region is the view's, via `pivotSortBy`, so these never move. Field
    // names are built from data values that may contain dots.
    private buildValueColumn(path: PivotPath, field: CubeField): ColumnSpec {
        const name = this.cellFieldName(path, field);
        return {
            ...this._valueSpecs[field.name],
            colId: name,
            field: name,
            chooserName: `${path.isRoot ? 'Total' : path.label} › ${field.displayName}`,
            movable: false,
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
            groupShowMode
        }: {level?: number; headerAlign?: HAlign; groupShowMode?: ColumnGroupShowMode}
    ): ColumnGroupSpec {
        const isPivotLevel = level != null;
        if (isPivotLevel) this._pivotGroupLevels.set(groupId, level);
        return {
            groupId,
            headerName,
            headerAlign,
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
    private _valueSpecs: Record<string, PivotValueSpec> = {};
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

function leafColIds(cols: Array<ColumnSpec | ColumnGroupSpec>): string[] {
    return cols.flatMap(it => ('children' in it ? leafColIds(it.children) : it.colId));
}

function resolveSide<T extends HSide | VSide>(val: boolean | T, dflt: T): T {
    if (val === true) return dflt;
    return val === false ? null : val;
}
