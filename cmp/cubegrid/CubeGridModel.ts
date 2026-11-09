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
    GridFilterBindTarget,
    GridFilterModelConfig,
    GridLikeModel,
    GridModelPersistOptions,
    GridSelectFirstOptions,
    GridSelectOptions
} from '@xh/hoist/cmp/grid';
import {GridModel} from '@xh/hoist/cmp/grid';
import {initPersist} from '@xh/hoist/cmp/grid/impl/InitPersist';
import {createExpandCollapseItem} from '@xh/hoist/cmp/grid/impl/MenuSupport';
import type {Awaitable, ReactionSpec, Some, VSide} from '@xh/hoist/core';
import {HoistModel, managed} from '@xh/hoist/core';
import type {Cube, QueryConfig, Store, StoreRecordOrId, View} from '@xh/hoist/data';
import {action, bindableRef} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isEmpty, isEqual, isFunction, keyBy, pick} from 'lodash';
import type {CubeGridPivotConfig} from './CubeGridPivotModel';
import {CubeGridPivotModel} from './CubeGridPivotModel';

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
     * fields - a measure's bare name is its row summary, whether or not the query pivots. When
     * none is a tree column, a label column for the row dimensions is placed first. Pivot columns,
     * if any, follow this region.
     */
    columns?: Array<ColumnSpec | ColumnGroupSpec>;

    /**
     * Config for the underlying GridModel. `store`, `treeMode` and `columns` are managed by this
     * model and cannot be set here; everything else is a default this config overrides. A
     * `showSummary` row needs `includeRoot` on the query, which is what produces it. `persistWith`
     * attaches once the pivot columns exist, so saved state can name them.
     *
     * A `filterModel` binds to `'view'` by default, filtering the source records and
     * re-aggregating. Bind it to `'store'` to filter the group rows by their aggregates instead.
     */
    gridConfig?: Omit<GridConfig, 'store' | 'treeMode' | 'columns' | 'filterModel'> & {
        filterModel?:
            | boolean
            | (Omit<GridFilterModelConfig, 'bind'> & {
                  bind?: GridFilterBindTarget | 'view' | 'store';
              });
    };

    /** Config for the pivot region, held by {@link CubeGridModel.pivotModel}. */
    pivotConfig?: CubeGridPivotConfig;
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

    @bindableRef accessor columns: Array<ColumnSpec | ColumnGroupSpec>;

    //------------------------
    // Child Models
    //------------------------

    /** Store projecting the view's rows. Owned here - GridModel never manages a store instance. */
    @managed readonly store: Store;
    @managed readonly gridModel: GridModel;
    @managed readonly pivotModel: CubeGridPivotModel;

    constructor({view, cube, query, columns = [], gridConfig, pivotConfig}: CubeGridConfig) {
        super();

        throwIf(
            !view && !cube,
            'CubeGridModel requires either a `view` or a `cube` with a `query`.'
        );
        throwIf(view && cube, 'Specify either `view` or `cube` for a CubeGridModel, not both.');
        this.view = view ?? this.markManaged(cube.createView({query, connect: true}));

        this.columns = columns;
        this.pivotModel = new CubeGridPivotModel(pivotConfig ?? {}, this);

        this.store = this.view.createStore({connect: true});
        const {persistWith, ...restGridConfig} = gridConfig ?? {};
        this.gridModel = this.createGridModel(restGridConfig);

        this._pendingPersistWith = persistWith;
        this.initPersistWhenReady();

        // Rebuilds react first, so a pivot option change re-autosizes the rebuilt columns.
        this.addReaction(this.columnsReaction(), this.regionsReaction());
        this.pivotModel.initWidths();
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

    // `equals: 'shallow'` - the track fn allocates a fresh array per run.
    private columnsReaction(): ReactionSpec {
        return {
            equals: 'shallow',
            track: () => [this.view.result.paths, this.columns, ...this.pivotModel.regionDeps],
            run: () => this.rebuildColumns()
        };
    }

    private createGridModel(config: CubeGridConfig['gridConfig']): GridModel {
        return new GridModel({
            emptyText: 'No data',
            colChooserModel: true,
            stripeRows: true,
            rowBorders: true,
            levelLabels: () => this.rowLevelLabels,
            ...config,
            filterModel: this.parseFilterModel(config.filterModel),
            headerContextMenu: this.parseHeaderContextMenu(config),
            store: this.store,
            treeMode: true,
            columns: this.buildColumns(),
            restoreDefaultsFn: () => this.restoreDefaultsAsync(config.restoreDefaultsFn)
        });
    }

    // Each row dimension. The root, if any, loads as the summary record, not a tree level. Read on
    // use, so it follows the query.
    private get rowLevelLabels(): string[] {
        return this.query.dimensions.map(it => it.displayName);
    }

    // In a header menu, `expandCollapse` expands the pivot columns, and shows only over them. It
    // leads the default menu. A grid with no context menu gets no default header menu.
    private parseHeaderContextMenu({
        headerContextMenu: spec,
        contextMenu
    }: CubeGridConfig['gridConfig']): GridConfig['headerContextMenu'] {
        if (spec === false) return false;
        if (spec == null && (contextMenu === false || contextMenu === null)) return undefined;
        const {pivotModel} = this,
            items = spec ?? ['expandCollapse', '-', ...GridModel.defaults.headerContextMenu];
        return (agParams, gridModel) =>
            (isFunction(items) ? items(agParams, gridModel) : items).flatMap(it =>
                it === 'expandCollapse'
                    ? pivotModel.isInRegion(agParams)
                        ? createExpandCollapseItem(pivotModel)
                        : []
                    : it
            );
    }

    // Column filters bind to the view, so they filter the source records and re-aggregate. The
    // view and store are this model's own, so their names stand for them. Specs default to the
    // query's fields either way, as the store's include a field per cell.
    private parseFilterModel(
        filterModel: CubeGridConfig['gridConfig']['filterModel']
    ): GridConfig['filterModel'] {
        if (!filterModel) return null;
        const {bind = 'view', ...rest} = filterModel === true ? {} : filterModel;
        return {
            fieldSpecs: this.view.fieldNames,
            ...rest,
            bind: bind === 'view' ? this.view : bind === 'store' ? this.store : bind
        };
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
        const {gridModel, pivotModel} = this,
            {columnState: prior, columnGroupState} = gridModel,
            priorById = keyBy(prior, 'colId');

        gridModel.setColumns(this.buildColumns());

        const {colIds} = pivotModel,
            fixed = prior.filter(it => !colIds.has(it.colId)),
            pivot = gridModel.columnState
                .filter(it => colIds.has(it.colId))
                .map(it => ({
                    ...it,
                    width: pivotModel.widthFor(it.colId) ?? it.width,
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
        const {gridModel} = this,
            {colIds} = this.pivotModel,
            {columnState} = gridModel,
            ordered = [
                ...columnState.filter(it => !colIds.has(it.colId)),
                ...columnState.filter(it => colIds.has(it.colId))
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
        return [...this.buildFixedColumns(), ...this.pivotModel.buildRegion()];
    }

    // The app's columns, with a default label column first unless the app supplied a tree column.
    private buildFixedColumns(): Array<ColumnSpec | ColumnGroupSpec> {
        const {columns} = this,
            hasTreeCol = columns.some(it => 'isTreeColumn' in it && it.isTreeColumn);
        return hasTreeCol ? columns : [this.buildLabelColumn(), ...columns];
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

    private _pendingPersistWith: GridModelPersistOptions = null;

    override destroy() {
        // The view registered this store rather than owning it, and outlives any grid bound to it.
        this.view?.disconnectStore(this.store);
        super.destroy();
    }
}
