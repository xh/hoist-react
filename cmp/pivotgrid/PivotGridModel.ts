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
import {warnIf} from '@xh/hoist/utils/js';
import {isArray, isEmpty, orderBy, sortBy} from 'lodash';

/**
 * Display sort for the pivot values at one level of the path tree, outermost level first.
 *
 * `'asc'` / `'desc'` sort by raw dimension value. An array is an explicit ordering of raw dimension
 * values, with anything unlisted following in the view's own (ascending) order. `null` leaves the
 * level in that view order.
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
     * True to show the docked row-totals column(s) - the aggregate across all pivot paths, one
     * column per value field. Default false. Omitted from the grid entirely when off, so bind this
     * rather than reaching for the column chooser.
     */
    showRowTotals?: boolean;

    /** Side to dock the row-totals column(s) on. Default 'right'. */
    rowTotalsSide?: HSide;

    /**
     * True to show pivot-totals columns - the subtotal at each parent pivot node. Default false.
     * Only ever visible with 2+ pivot dimensions, since a single dimension has no parent nodes.
     */
    showPivotTotals?: boolean;

    /** Side to place pivot-totals columns on within their group. Default 'right'. */
    pivotTotalsSide?: HSide;

    /**
     * True to show the docked value-totals row - the aggregate down all group rows. Default false.
     * Requires `includeRoot` on the query, which is what produces the row.
     */
    showValueTotals?: boolean;

    /** Side to dock the value-totals row on. Default 'top'. */
    valueTotalsSide?: VSide;

    /** Display sort per pivot dimension, outermost first. Unspecified levels keep view order. */
    pivotSortBy?: PivotSort[];

    /**
     * Column config applied to every column built for the named value field - renderer, width,
     * align, and so on. Keyed by value field name.
     */
    valueColumnSpecs?: Record<string, ColumnSpec>;

    /**
     * True to autosize columns after each structural column rebuild. Default false - autosizing
     * across hundreds of pivot columns is expensive. Tune the sizing itself via
     * `gridConfig.autosizeOptions`.
     */
    autosizeColumns?: boolean;

    /**
     * Config for the underlying GridModel. `store`, `treeMode` and `showSummary` are managed by
     * this model and cannot be set here; everything else is a default this config overrides.
     */
    gridConfig?: Omit<GridConfig, 'store' | 'treeMode' | 'showSummary' | 'columns'>;
}

/**
 * Grid presentation of a {@link PivotView} - a tree grid of group rows whose columns are the pivot
 * paths, with optional docked totals.
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

    @bindable showRowTotals: boolean;
    @bindable rowTotalsSide: HSide;
    @bindable showPivotTotals: boolean;
    @bindable pivotTotalsSide: HSide;
    @bindable showValueTotals: boolean;
    @bindable valueTotalsSide: VSide;
    @bindable.ref pivotSortBy: PivotSort[];
    @bindable.ref valueColumnSpecs: Record<string, ColumnSpec>;
    @bindable autosizeColumns: boolean;

    //------------------------
    // Child Models
    //------------------------
    /** Store projecting the view's rows. Owned here - GridModel never manages a store instance. */
    @managed readonly store: Store;
    @managed readonly gridModel: GridModel;

    constructor({
        view,
        showRowTotals = false,
        rowTotalsSide = 'right',
        showPivotTotals = false,
        pivotTotalsSide = 'right',
        showValueTotals = false,
        valueTotalsSide = 'top',
        pivotSortBy = [],
        valueColumnSpecs = {},
        autosizeColumns = false,
        gridConfig
    }: PivotGridConfig) {
        super();
        makeObservable(this);

        this.view = view;
        this.showRowTotals = showRowTotals;
        this.rowTotalsSide = rowTotalsSide;
        this.showPivotTotals = showPivotTotals;
        this.pivotTotalsSide = pivotTotalsSide;
        this.showValueTotals = showValueTotals;
        this.valueTotalsSide = valueTotalsSide;
        this.pivotSortBy = pivotSortBy;
        this.valueColumnSpecs = valueColumnSpecs;
        this.autosizeColumns = autosizeColumns;

        warnIf(
            showValueTotals && !view.query.includeRoot,
            'PivotGridModel.showValueTotals has no effect unless the PivotQuery sets `includeRoot` - that root row *is* the value-totals row.'
        );

        this.store = view.createStore({connect: true});
        this.gridModel = this.createGridModel(gridConfig);

        this.addReaction(this.columnsReaction(), this.valueTotalsReaction());
    }

    //------------------------
    // Implementation
    //------------------------
    private get query() {
        return this.view.query;
    }

    /**
     * Rebuild columns when the pivot structure changes, or when a config that shapes them does.
     *
     * Tracks `result.paths` by identity - the data layer republishes the same object whenever the
     * structure held, so a values-only tick does no column work. `equals: 'shallow'` is load-bearing
     * for that: the track fn allocates a fresh array per run, so the default identity comparer would
     * see a change on every single view update.
     *
     * Running after the view has already loaded the store is harmless: `noteCubeLoaded` /
     * `noteCubeUpdated` are `@action`, so the load and this `setColumns` land in one batch with no
     * intermediate paint.
     */
    private columnsReaction(): ReactionSpec {
        return {
            equals: 'shallow',
            track: () => [
                this.view.result.paths,
                this.showRowTotals,
                this.rowTotalsSide,
                this.showPivotTotals,
                this.pivotTotalsSide,
                this.pivotSortBy,
                this.valueColumnSpecs
            ],
            run: () => {
                this.rebuildColumns();
                if (this.autosizeColumns) this.gridModel.autosizeAsync();
            }
        };
    }

    private valueTotalsReaction(): ReactionSpec<[boolean, VSide]> {
        return {
            track: () => [this.showValueTotals, this.valueTotalsSide],
            run: ([show, side]) => (this.gridModel.showSummary = show ? side : false),
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
                // Cell field names are data-derived and may contain dots, which would otherwise be
                // read as a path into a nested value.
                enableDotSeparatedFieldPath: false
            },
            store: this.store,
            treeMode: true,
            columns: this.buildColumns()
        });
    }

    /**
     * Preserves the label column's state only. Broader preservation is persistence's job, and
     * restoring a prior *order* across a structural change can fight the new column groups.
     */
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

        // Degenerate, unpivoted case: no paths, so the value fields are simply the measures. Show
        // them unconditionally - `showRowTotals` off would otherwise leave a grid of labels alone.
        if (isEmpty(paths)) {
            return [label, ...this.buildValueColumns(this._rootPath)];
        }

        const pivotCols = this.sortPaths(paths, 0).map(path => this.buildPathColumn(path)),
            totalCols = this.showRowTotals ? [this.buildTotalsColumn(this._rootPath)] : [];

        return this.rowTotalsSide === 'left'
            ? [label, ...totalCols, ...pivotCols]
            : [label, ...pivotCols, ...totalCols];
    }

    /**
     * Cell field names by (path identity, value field name), rebuilt per column pass. Bound to path
     * *identity*, so a stale path can never resolve a name - and read from the view's published
     * `cellFields` rather than reconstructed, so the grid layer never duplicates the naming rule.
     */
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
            // Genuinely dynamic - `view.updateQuery` can change the groupings under us.
            headerName: () =>
                this.query.dimensions.map(it => it.displayName ?? it.name).join(' › '),
            // Group labels are stringified dimension values; sort them as the source field would.
            sortValue: (v, {record}) => this.store.getField(record.data.cubeDimension)?.parseVal(v),
            renderer: v => (isEmpty(v) || v === 'null' ? '(empty)' : v)
        };
    }

    /**
     * One column (or group) for a pivot path. A leaf path with a single value field takes the path's
     * own label as its header, rather than adding a group level that reads as a duplicate.
     */
    private buildPathColumn(path: PivotPath): ColumnSpec | ColumnGroupSpec {
        const {valueFields} = this.query;

        if (isEmpty(path.children)) {
            if (valueFields.length === 1) {
                return {
                    ...this.buildValueColumn(path, valueFields[0]),
                    headerName: path.label,
                    headerAlign: 'center'
                };
            }
            return this.group(path.key, path.label, this.buildValueColumns(path));
        }

        const childCols = this.sortPaths(path.children, path.depth).map(child =>
                this.buildPathColumn(child)
            ),
            totalCols = this.showPivotTotals ? [this.buildTotalsColumn(path)] : [];

        return this.group(
            path.key,
            path.label,
            this.pivotTotalsSide === 'left'
                ? [...totalCols, ...childCols]
                : [...childCols, ...totalCols]
        );
    }

    /**
     * Totals for one pivot path. Row totals are the pivot totals at the root path - the same cells at
     * different depths - so one method serves both.
     */
    private buildTotalsColumn(path: PivotPath): ColumnSpec | ColumnGroupSpec {
        const cols = this.buildValueColumns(path);
        return cols.length === 1
            ? {...cols[0], headerName: 'Total', headerAlign: 'center'}
            : this.group(path.isRoot ? 'rowTotals' : `${path.key}:totals`, 'Total', cols);
    }

    private buildValueColumns(path: PivotPath): ColumnSpec[] {
        return this.query.valueFields.map(field => this.buildValueColumn(path, field));
    }

    /**
     * A value column binds the cell field the view published for this (path, value field) pair. At
     * the root path that field name *is* the value field's own name, which is what makes the
     * totals-vs-cells invariant structural rather than a naming convention.
     */
    private buildValueColumn(path: PivotPath, field: CubeField): ColumnSpec {
        const name = this.cellFieldName(path, field);
        return {
            ...this.valueColumnSpecs[field.name],
            colId: name,
            field: name
        };
    }

    private group(
        id: string,
        headerName: string,
        children: Array<ColumnSpec | ColumnGroupSpec>
    ): ColumnGroupSpec {
        return {groupId: id, headerName, headerAlign: 'center', children};
    }

    /**
     * Sorted for *display only*, never written back: `result.paths` is immutable and identity-stable,
     * and mutating `children` would corrupt the view's own state.
     */
    private sortPaths(paths: PivotPath[], depth: number): PivotPath[] {
        const spec = this.pivotSortBy[depth] ?? null;

        if (spec === 'asc' || spec === 'desc') return orderBy(paths, 'value', spec);

        if (isArray(spec)) {
            // Unlisted values share one key, so the stable sort leaves them in view order behind
            // everything named.
            return sortBy(paths, it => {
                const idx = spec.indexOf(it.value);
                return idx === -1 ? spec.length : idx;
            });
        }

        return paths;
    }

    /** Falls back to the value field's own name, which is exactly the root-path cell field. */
    private cellFieldName(path: PivotPath, field: CubeField): string {
        return this._cellFieldNames.get(path)?.get(field.name) ?? field.name;
    }

    private _cellFieldNames: Map<PivotPath, Map<string, string>> = new Map();
    private _rootPath: PivotPath = null;

    override destroy() {
        // The view outlives any grid bound to it, and registered *this* store rather than owning it.
        this.view?.disconnectStore(this.store);
        super.destroy();
    }
}
