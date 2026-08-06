/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnGroupSpec, ColumnSpec, GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, HSide, managed, ReactionSpec, VSide} from '@xh/hoist/core';
import {CubeField, PivotCellField, PivotPath, PivotView, Store} from '@xh/hoist/data';
import {action, bindable, makeObservable} from '@xh/hoist/mobx';
import {isArray, isEmpty, orderBy, sortBy} from 'lodash';

/**
 * Display sort for the pivot values at one level of the path tree.
 *
 * `'asc'` / `'desc'` sort by raw dimension value. An array is an explicit ordering of raw dimension
 * values, with anything unlisted following in the view's own ascending order. `null` leaves the level
 * in that view order.
 */
export type PivotSort = 'asc' | 'desc' | any[] | null;

/**
 * Configuration for a {@link PivotGridModel}.
 *
 * Carries no query configuration: `dimensions`, `pivotDimensions`, `valueFields`, `includeRoot` and
 * the rest live on the {@link PivotQuery} behind `view`, and apps reconfigure by calling
 * `view.updateQuery()`. Everything here is presentational.
 *
 * @see PivotGridModel
 */
export interface PivotGridConfig {
    /**
     * View supplying this grid's data. Owned by the *application* - this model neither manages nor
     * destroys it, and cannot swap it after construction. Two PivotGridModels may bind to one view;
     * each mints its own Store.
     */
    view: PivotView;

    /**
     * Docked summary column(s) holding each value field's aggregate across all pivot paths. True for
     * the default 'right', or an {@link HSide} to place them. Default false, which omits them
     * entirely - bind this rather than expecting the column chooser to restore them.
     */
    rowSummary?: boolean | HSide;

    /**
     * Summary columns holding each value field's subtotal at every parent pivot node. True for the
     * default 'right', or an {@link HSide} to place them within their group. Default false. Only
     * ever visible with 2+ pivot dimensions, since a single dimension has no parent nodes.
     */
    pivotSummary?: boolean | HSide;

    /**
     * Docked summary row holding each pivot path's aggregate down all group rows. True for the
     * default 'top', or a {@link VSide} to place it. Default false. Requires `includeRoot` on the
     * query, which is what produces the row.
     */
    valueSummary?: boolean | VSide;

    /** Display sort per pivot dimension, outermost first. Unspecified levels keep view order. */
    pivotSortBy?: PivotSort[];

    /**
     * Column config applied to every column built for the named value field - renderer, width,
     * align, and so on. Keyed by value field name.
     */
    valueColumnSpecs?: Record<string, ColumnSpec>;

    /**
     * Config for the underlying GridModel. `store`, `treeMode` and `showSummary` are managed by
     * this model and cannot be set here; everything else is a default this config overrides.
     */
    gridConfig?: Omit<GridConfig, 'store' | 'treeMode' | 'showSummary' | 'columns'>;
}

/**
 * Grid presentation of a {@link PivotView} - a tree grid of group rows whose columns are the pivot
 * paths, with optional docked summaries.
 *
 * Takes a view and owns everything downstream of it: the grid Store (minted via
 * {@link PivotView.createStore} and disconnected on destroy), the {@link GridModel}, and the column
 * hierarchy. The view keeps the Store's cell fields in sync itself; this model rebuilds columns when
 * `result.paths` changes identity, which is the data layer's structural-change signal.
 *
 * @see PivotGridConfig
 * @mcpHint tree grid rendering a pivoted Cube view, with pivot paths as columns
 */
export class PivotGridModel extends HoistModel {
    /** View supplying this grid's data. Application-owned; not swappable. */
    readonly view: PivotView;

    @bindable rowSummary: boolean | HSide;
    @bindable pivotSummary: boolean | HSide;
    @bindable valueSummary: boolean | VSide;
    @bindable.ref pivotSortBy: PivotSort[];
    @bindable.ref valueColumnSpecs: Record<string, ColumnSpec>;

    //------------------------
    // Child Models
    //------------------------

    /** Store projecting the view's rows. Owned here - GridModel never manages a store instance. */
    @managed readonly store: Store;
    @managed readonly gridModel: GridModel;

    constructor({
        view,
        rowSummary = false,
        pivotSummary = false,
        valueSummary = false,
        pivotSortBy = [],
        valueColumnSpecs = {},
        gridConfig
    }: PivotGridConfig) {
        super();
        makeObservable(this);

        this.view = view;
        this.rowSummary = rowSummary;
        this.pivotSummary = pivotSummary;
        this.valueSummary = valueSummary;
        this.pivotSortBy = pivotSortBy;
        this.valueColumnSpecs = valueColumnSpecs;

        this.store = view.createStore({connect: true});
        this.gridModel = this.createGridModel(gridConfig);

        this.addReaction(this.columnsReaction(), this.valueSummaryReaction());
    }

    //------------------------
    // Implementation
    //------------------------

    private get query() {
        return this.view.query;
    }

    private get rowSummarySide(): HSide {
        return resolveSide(this.rowSummary, 'right');
    }

    private get pivotSummarySide(): HSide {
        return resolveSide(this.pivotSummary, 'right');
    }

    // `equals: 'shallow'` is load-bearing - the track fn allocates a fresh array per run, so the
    // default identity comparer would rebuild columns on every view update.
    private columnsReaction(): ReactionSpec {
        return {
            equals: 'shallow',
            track: () => [
                this.view.result.paths,
                this.rowSummary,
                this.pivotSummary,
                this.pivotSortBy,
                this.valueColumnSpecs
            ],
            run: () => this.rebuildColumns()
        };
    }

    private valueSummaryReaction(): ReactionSpec<boolean | VSide> {
        return {
            track: () => this.valueSummary,
            run: v => (this.gridModel.showSummary = resolveSide(v, 'top') ?? false),
            fireImmediately: true
        };
    }

    private createGridModel(config: PivotGridConfig['gridConfig']): GridModel {
        return new GridModel({
            emptyText: 'No data',
            colChooserModel: true,
            stripeRows: true,
            rowBorders: true,
            ...config,
            colDefaults: {
                ...config?.colDefaults,
                // Field names are derived from data values.
                enableDotSeparatedFieldPath: false
            },
            store: this.store,
            treeMode: true,
            columns: this.buildColumns()
        });
    }

    @action
    private rebuildColumns() {
        const {gridModel} = this,
            labelState = gridModel.getStateForColumn('cubeLabel');
        gridModel.setColumns(this.buildColumns());
        gridModel.updateColumnState([labelState]);
    }

    private buildColumns(): Array<ColumnSpec | ColumnGroupSpec> {
        const {paths, cellFields} = this.view.result;

        this.indexCellFields(cellFields);
        const label = this.buildLabelColumn();

        // Unpivoted, so the value fields are just measures - shown regardless of `rowSummary`, which
        // off would otherwise leave a grid of labels alone.
        if (isEmpty(paths)) return [label, ...this.buildValueColumns(this._rootPath)];

        const {rowSummarySide} = this,
            pathCols = this.sortPaths(paths, 0).map(path => this.buildPathColumn(path)),
            summaryCols = rowSummarySide ? [this.buildSummaryColumn(this._rootPath)] : [];

        return rowSummarySide === 'left'
            ? [label, ...summaryCols, ...pathCols]
            : [label, ...pathCols, ...summaryCols];
    }

    // Keyed on path *identity*, so a stale path can never resolve a name.
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
            pinned: false,
            headerName: () => this.query.dimensions.map(it => it.displayName).join(' › '),
            // Labels are stringified dimension values - sort them as their source field would.
            sortValue: (v, {record}) => this.store.getField(record.data.cubeDimension)?.parseVal(v),
            renderer: v => (isEmpty(v) || v === 'null' ? '(empty)' : v)
        };
    }

    private buildPathColumn(path: PivotPath): ColumnSpec | ColumnGroupSpec {
        const {valueFields} = this.query;

        if (isEmpty(path.children)) {
            // A group of one would read as a duplicate header.
            if (valueFields.length === 1) {
                return {
                    ...this.buildValueColumn(path, valueFields[0]),
                    headerName: path.label,
                    headerAlign: 'center'
                };
            }
            return this.buildColGroup(path.key, path.label, this.buildValueColumns(path));
        }

        const {pivotSummarySide} = this,
            childCols = this.sortPaths(path.children, path.depth).map(child =>
                this.buildPathColumn(child)
            ),
            summaryCols = pivotSummarySide ? [this.buildSummaryColumn(path)] : [];

        return this.buildColGroup(
            path.key,
            path.label,
            pivotSummarySide === 'left'
                ? [...summaryCols, ...childCols]
                : [...childCols, ...summaryCols]
        );
    }

    // Row summaries are the pivot summaries at the root path - the same cells at different depths.
    private buildSummaryColumn(path: PivotPath): ColumnSpec | ColumnGroupSpec {
        const cols = this.buildValueColumns(path);
        return cols.length === 1
            ? {...cols[0], headerName: 'Total', headerAlign: 'center'}
            : this.buildColGroup(path.isRoot ? 'rowSummary' : `${path.key}:summary`, 'Total', cols);
    }

    private buildValueColumns(path: PivotPath): ColumnSpec[] {
        return this.query.valueFields.map(field => this.buildValueColumn(path, field));
    }

    private buildValueColumn(path: PivotPath, field: CubeField): ColumnSpec {
        const name = this.cellFieldName(path, field);
        return {
            ...this.valueColumnSpecs[field.name],
            colId: name,
            field: name
        };
    }

    private buildColGroup(
        groupId: string,
        headerName: string,
        children: Array<ColumnSpec | ColumnGroupSpec>
    ): ColumnGroupSpec {
        return {groupId, headerName, headerAlign: 'center', children};
    }

    // Display only - `result.paths` is immutable, and mutating it corrupts the view's own state.
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

    override destroy() {
        // The view registered this store rather than owning it, and outlives any grid bound to it.
        this.view?.disconnectStore(this.store);
        super.destroy();
    }
}

function resolveSide<T extends HSide | VSide>(val: boolean | T, dflt: T): T {
    if (val === true) return dflt;
    return val === false ? null : val;
}
