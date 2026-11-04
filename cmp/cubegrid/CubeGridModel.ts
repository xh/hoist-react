/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {
    ColumnGroupSpec,
    ColumnSpec,
    GridConfig,
    GridEnsureVisibleOptions,
    GridModelPersistOptions,
    GridSelectFirstOptions,
    GridSelectOptions
} from '@xh/hoist/cmp/grid';
import {GridModel} from '@xh/hoist/cmp/grid';
import {initPersist} from '@xh/hoist/cmp/grid/impl/InitPersist';
import type {HSide, ReactionSpec, Some, VSide} from '@xh/hoist/core';
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
import {action, bindable, bindableRef} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isArray, isEmpty, keyBy, mapValues, omit, orderBy, pick, sortBy} from 'lodash';

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
     * Docked column per value field holding each row's aggregate across all pivot paths. True for
     * the default 'right', or an {@link HSide} to place it relative to the pivot columns. Default
     * false. Bind this rather than expecting the column chooser to restore it.
     */
    pivotValueSummary?: boolean | HSide;

    /**
     * Column per value field inside each parent pivot group holding that group's aggregate. True
     * for the default 'right', or an {@link HSide} to place it within the group. Default false.
     * Only ever visible with 2+ pivot dimensions, since a single dimension has no parent nodes.
     */
    pivotGroupSummary?: boolean | HSide;

    /** Display sort per pivot dimension, outermost first. Unspecified levels keep view order. */
    pivotSortBy?: PivotSort[];

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
export class CubeGridModel extends HoistModel {
    /** View supplying this grid's data. Not swappable. */
    readonly view: View;

    @bindable accessor pivotValueSummary: boolean | HSide;
    @bindable accessor pivotGroupSummary: boolean | HSide;
    @bindableRef accessor pivotSortBy: PivotSort[];
    @bindableRef accessor pivotValueSpecs: Record<string, PivotValueSpec>;
    @bindableRef accessor columns: Array<ColumnSpec | ColumnGroupSpec>;

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
        pivotValueSummary = false,
        pivotGroupSummary = false,
        pivotSortBy = [],
        pivotValueSpecs = {},
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
        this.pivotValueSummary = pivotValueSummary;
        this.pivotGroupSummary = pivotGroupSummary;
        this.pivotSortBy = pivotSortBy;
        this.pivotValueSpecs = pivotValueSpecs;

        this.store = this.view.createStore({connect: true});
        const {persistWith, ...restGridConfig} = gridConfig ?? {};
        this.gridModel = this.createGridModel(restGridConfig);

        this._pendingPersistWith = persistWith;
        this.initPersistWhenReady();

        this.addReaction(this.columnsReaction());
    }

    //------------------------
    // Selection and state - delegated to the GridModel, as in ZoneGridModel
    //------------------------

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

    private get pivotValueSummarySide(): HSide {
        return resolveSide(this.pivotValueSummary, 'right');
    }

    private get pivotGroupSummarySide(): HSide {
        return resolveSide(this.pivotGroupSummary, 'right');
    }

    // `equals: 'shallow'` - the track fn allocates a fresh array per run.
    private columnsReaction(): ReactionSpec {
        return {
            equals: 'shallow',
            track: () => [
                this.view.result.paths,
                this.columns,
                this.pivotValueSummary,
                this.pivotGroupSummary,
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
        if (!this.query.isPivoted) return fixed;

        const {pivotValueSummarySide} = this,
            pathCols = this.sortPaths(paths, 0).map(path => this.buildPathColumn(path)),
            summaryCols =
                pivotValueSummarySide && this._rootPath
                    ? [this.buildSummaryColumn(this._rootPath)]
                    : [],
            pivotCols =
                pivotValueSummarySide === 'left'
                    ? [...summaryCols, ...pathCols]
                    : [...pathCols, ...summaryCols];

        this._pivotColIds = new Set(leafColIds(pivotCols));
        return [...fixed, ...pivotCols];
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
            return this.buildColGroup(path.key, path.label, this.buildValueColumns(path));
        }

        const {pivotGroupSummarySide} = this,
            childCols = this.sortPaths(path.children, path.depth).map(child =>
                this.buildPathColumn(child)
            ),
            summaryCols = pivotGroupSummarySide ? [this.buildSummaryColumn(path)] : [];

        return this.buildColGroup(
            path.key,
            path.label,
            pivotGroupSummarySide === 'left'
                ? [...summaryCols, ...childCols]
                : [...childCols, ...summaryCols]
        );
    }

    // Row summaries are the pivot summaries at the root path - the same cells at different depths.
    // A summary column binds the path's own cell but takes a colId of its own, so the root summary
    // never collides with a fixed column bound to the same measure.
    private buildSummaryColumn(path: PivotPath): ColumnSpec | ColumnGroupSpec {
        const cols = this.buildValueColumns(path).map(col => ({
            ...col,
            colId: `total>>${col.colId}`
        }));
        return this.buildColGroup(
            path.isRoot ? 'pivotValueSummary' : `${path.key}:groupSummary`,
            'Total',
            cols
        );
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
            enableDotSeparatedFieldPath: false
        };
    }

    private buildColGroup(
        groupId: string,
        headerName: string,
        children: Array<ColumnSpec | ColumnGroupSpec>
    ): ColumnGroupSpec {
        return {groupId, headerName, headerAlign: 'center', children};
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

    override destroy() {
        // The view registered this store rather than owning it, and outlives any grid bound to it.
        this.view?.disconnectStore(this.store);
        super.destroy();
    }
}

function leafColIds(cols: Array<ColumnSpec | ColumnGroupSpec>): string[] {
    return cols.flatMap(it => ('children' in it ? leafColIds(it.children) : it.colId));
}

function resolveSide<T extends HSide | VSide>(val: boolean | T, dflt: T): T {
    if (val === true) return dflt;
    return val === false ? null : val;
}
