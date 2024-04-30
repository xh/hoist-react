/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, PlainObject, SizingMode, Some} from '@xh/hoist/core';
import type {GridApi, IRowNode, SortDirection} from '@xh/hoist/kit/ag-grid';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {
    castArray,
    cloneDeep,
    concat,
    find,
    has,
    isArray,
    isEmpty,
    isEqual,
    isNil,
    partition,
    setWith,
    startCase
} from 'lodash';
import {GridSorter, GridSorterLike} from '../grid/GridSorter';

export interface AgGridModelConfig {
    sizingMode?: SizingMode;

    /** True to highlight the currently hovered row. */
    showHover?: boolean;

    /** True to render row borders. */
    rowBorders?: boolean;

    /** True to render row borders. */
    cellBorders?: boolean;

    /** True to render cell borders. */
    stripeRows?: boolean;

    /** True to highlight the focused cell with a border. */
    showCellFocus?: boolean;

    /** True to suppress display of the grid's header row. */
    hideHeaders?: boolean;

    /** @internal */
    xhImpl?: boolean;
}

/**
 * @see https://www.ag-grid.com/javascript-grid-column-definitions/#saving-and-restoring-column-state
 */
export interface AgGridColumnState {
    isPivot: boolean;

    /** State of each column in the grid. */
    columns: any[];
}
export interface AgGridColumnSortState {
    colId: string;
    sort?: SortDirection;
    sortIndex: number;
}

export interface AgGridMiscState {
    /** Identifier of the currently open tool panel in the side bar*/
    panelId: string;
}
export interface AgGridState {
    columnState?: AgGridColumnState;
    sortState?: AgGridColumnSortState[];
    expandState?: any;
    filterState?: any[];
    miscState?: AgGridMiscState;
    errors?: Record<string, string>;
}

/**
 * Model for an AgGrid, provides reactive support for setting grid styling as well as access to the
 * ag-Grid API and Column API references for interacting with ag-Grid.
 *
 * Also provides a series of utility methods that are generally useful when managing grid state.
 * This includes the ability to get and set the full state of the grid in a serializable form,
 * allowing applications to save "views" of the grid.
 */
export class AgGridModel extends HoistModel {
    static AUTO_GROUP_COL_ID = 'ag-Grid-AutoColumn';

    //------------------------
    // Grid Style
    //------------------------
    @bindable sizingMode: SizingMode;
    @bindable rowBorders: boolean;
    @bindable stripeRows: boolean;
    @bindable cellBorders: boolean;
    @bindable showHover: boolean;
    @bindable showCellFocus: boolean;
    @bindable hideHeaders: boolean;

    @observable.ref agApi: GridApi = null;

    private _prevSortBy: GridSorter[];

    constructor({
        sizingMode = 'standard',
        showHover = false,
        rowBorders = false,
        cellBorders = false,
        stripeRows = true,
        showCellFocus = false,
        hideHeaders = false,
        xhImpl = false
    }: AgGridModelConfig = {}) {
        super();
        makeObservable(this);
        this.xhImpl = xhImpl;

        this.sizingMode = sizingMode;
        this.showHover = showHover;
        this.rowBorders = rowBorders;
        this.cellBorders = cellBorders;
        this.stripeRows = stripeRows;
        this.showCellFocus = showCellFocus;
        this.hideHeaders = hideHeaders;

        this.addReaction({
            track: () => this.sizingMode,
            run: () => {
                const api = this.agApi;
                if (!api) return;
                api.resetRowHeights();

                // Reset summary row data to respond to row height change
                // See: https://www.ag-grid.com/javascript-grid-row-height/#height-for-pinned-rows
                this.setPinnedTopRowData(this.getPinnedTopRowData());
                this.setPinnedBottomRowData(this.getPinnedBottomRowData());
            },
            debounce: 1 // Debounce required to support auto row height
        });
    }

    /** True if the grid fully initialized and its state can be queried/mutated. */
    @computed
    get isReady(): boolean {
        return !isNil(this.agApi);
    }

    /**
     * Retrieves the current state of the grid via ag-Grid APIs. This state is returned in a
     * serializable form and can be later restored via setState.
     */
    getState(
        opts: {
            excludeColumnState?: boolean;
            excludeSortState?: boolean;
            excludeExpandState?: boolean;
            excludeFilterState?: boolean;
            excludeMiscState?: boolean;
        } = {}
    ): AgGridState {
        this.throwIfNotReady();

        const errors = {},
            getStateChunk = type => {
                if (opts[`exclude${startCase(type)}State`]) return undefined;

                try {
                    return this[`get${startCase(type)}State`]();
                } catch (err) {
                    this.logWarn(`Encountered errors retrieving ${type} state`, err);
                    errors[type] = err.toString();
                }
            };

        const columnState = getStateChunk('column'),
            sortState = getStateChunk('sort'),
            expandState = getStateChunk('expand'),
            filterState = getStateChunk('filter'),
            miscState = getStateChunk('misc');

        return {
            columnState,
            sortState,
            expandState,
            filterState,
            miscState,
            errors: isEmpty(errors) ? undefined : errors
        };
    }

    /**
     * Sets the current state of the grid. This method should generally only be used with an object
     * returned by getState.
     *
     * Calls to this method should be made after the columns have been set in the grid.
     *
     * Some of the state may be data-dependent. Specifically the expandState and filterState. It is
     * recommended that applications wait until the data has been loaded in the grid before setting
     * the state if including those elements. This method can be called immediately after the data
     * has been loaded via `agApi.updateGridOptions({rowData: data})`.
     */
    setState(state: AgGridState) {
        this.throwIfNotReady();

        const {columnState, sortState, expandState, filterState, miscState} = state;
        if (columnState) this.setColumnState(columnState);
        if (sortState) this.setSortState(sortState);
        if (expandState) this.setExpandState(expandState);
        if (filterState) this.setFilterState(filterState);
        if (miscState) this.setMiscState(miscState);
    }

    getMiscState(): AgGridMiscState {
        this.throwIfNotReady();

        return {
            panelId: this.agApi.getOpenedToolPanel()
        };
    }

    /**
     * Sets the grid state which doesn't fit into the other buckets.
     */
    setMiscState(miscState: AgGridMiscState) {
        this.throwIfNotReady();

        const {agApi} = this,
            {panelId} = miscState;

        if (isNil(panelId)) {
            agApi.closeToolPanel();
        } else {
            agApi.openToolPanel(panelId);
        }
    }

    /**
     * @returns Current filter state of the grid.
     * @see https://www.ag-grid.com/javascript-grid-filtering/#get-set-all-filter-models
     */
    getFilterState(): PlainObject {
        this.throwIfNotReady();

        const {agApi} = this;
        return agApi.getFilterModel();
    }

    /**
     * Sets the grid filter state.
     * Note that this state may be data-dependent, depending on the types of filter being used.
     */
    setFilterState(filterState: any) {
        this.throwIfNotReady();

        const {agApi} = this;

        agApi.setFilterModel(filterState);
        agApi.onFilterChanged();
    }

    /**
     * @returns current sort state of the grid.
     * @see https://www.ag-grid.com/javascript-grid-sorting/#sorting-api
     */
    getSortState(): AgGridColumnSortState[] {
        this.throwIfNotReady();

        const {agApi} = this,
            isPivot = agApi.isPivotMode();

        let colState: PlainObject[] = agApi.getColumnState().filter(it => it.sort);

        // When we have pivot columns we need to make sure we store the path to the sorted column
        // using the pivot keys and value column id, instead of using the auto-generate secondary
        // column id as this could be different with different data or even with the same data based
        // on the state of the grid when pivot mode was enabled.
        if (isPivot && !isEmpty(agApi.getPivotColumns())) {
            const secondarySortedCols = agApi
                .getPivotResultColumns()
                .filter(it => it.getSort()) as PlainObject[];
            secondarySortedCols.forEach(col => {
                col.colId = this.getPivotColumnId(col);
            });
            colState = concat(colState, secondarySortedCols);
        }

        return colState.map(it => ({
            colId: it.colId,
            sort: it.sort,
            sortIndex: it.sortIndex
        }));
    }

    /**
     * Sets the grid sort state.
     */
    setSortState(sortState: AgGridColumnSortState[]) {
        this.throwIfNotReady();

        const sortedColumnState = cloneDeep(sortState),
            [primaryColumnState, secondaryColumnState] = partition(
                sortedColumnState,
                it => !isArray(it.colId)
            ),
            {agApi} = this,
            isPivot = agApi.isPivotMode(),
            havePivotCols = !isEmpty(agApi.getPivotColumns()),
            defaultState = {
                sort: null,
                sortIndex: null
            };

        // ag-Grid does not allow "secondary" columns to be manipulated by applyColumnState
        // so this approach is required for setting sort config on secondary columns.
        if (isPivot && havePivotCols && !isEmpty(secondaryColumnState)) {
            // 1st clear all pre-existing primary column sorts
            // with an explicit clear of the auto_group column,
            // which is not cleared by the defaultState config.
            agApi.applyColumnState({
                state: [
                    {
                        colId: AgGridModel.AUTO_GROUP_COL_ID,
                        sort: null,
                        sortIndex: null
                    }
                ],
                defaultState
            });

            // 2nd clear all pre-existing secondary column sorts
            agApi.getPivotResultColumns().forEach(col => {
                if (col) {
                    // When using `applyColumnState`, `undefined` means do nothing, `null` means set to none, not cleared.
                    // But when using the setSort & setSortIndex methods directly, to clear all sort settings as if no sort
                    // had ever been specified, `undefined` must be used.
                    col.setSort(undefined, null);
                    col.setSortIndex(undefined);
                }
            });

            // finally apply sorts from state to secondary columns
            secondaryColumnState.forEach(state => {
                // TODO -- state saving for pivot appears broken.
                // Related to TS error below? Need to analyze and tear down if no longer needed.
                // @ts-ignore
                const col = agApi.getPivotResultColumn(state.colId[0], state.colId[1]);
                if (col) {
                    col.setSort(state.sort, null);
                    col.setSortIndex(state.sortIndex);
                } else {
                    this.logWarn(
                        'Could not find a secondary column to associate with the pivot column path',
                        state.colId
                    );
                }
            });
        }

        // always apply any sorts on primary columns (includes the auto_group column on pivot grids)
        agApi.applyColumnState({
            state: primaryColumnState,
            defaultState
        });

        agApi.onSortChanged();
    }

    /** @returns current column state of the grid, including pivot mode */
    getColumnState(): AgGridColumnState {
        this.throwIfNotReady();

        const {agApi} = this,
            columns = agApi.getColumnState();

        // sort config is collected in the getSortState function
        const sortKeys = ['sort', 'sortIndex'];
        columns.forEach(col => sortKeys.forEach(it => delete col[it]));

        return {
            isPivot: agApi.isPivotMode(),
            columns: columns
        };
    }

    /** Sets the columns state of the grid. */
    setColumnState(colState: AgGridColumnState) {
        this.throwIfNotReady();

        const {agApi} = this,
            validColIds = [
                AgGridModel.AUTO_GROUP_COL_ID,
                ...agApi.getColumns().map(it => it.getColId())
            ];

        let {isPivot, columns} = colState;
        agApi.setPivotMode(isPivot);

        if (isPivot && columns.some(it => !isNil(it.pivotIndex) && it.pivotIndex >= 0)) {
            // Exclude the auto group column as this causes issues with ag-grid when in pivot mode
            columns = columns.filter(it => it.colId !== AgGridModel.AUTO_GROUP_COL_ID);
        }

        // Remove invalid columns. ag-Grid does not like calls to set state with unknown column IDs.
        columns = columns.filter(it => validColIds.includes(it.colId));

        agApi.applyColumnState({state: columns, applyOrder: true});
    }

    /**
     * Sets the sort state on the grid's column state
     */
    applySortBy(value: Some<GridSorterLike>) {
        this.throwIfNotReady();
        const sortBy = castArray(value).map(it => GridSorter.parse(it));
        const {agApi} = this,
            prevSortBy = this._prevSortBy;
        let togglingAbsSort = false;

        if (isEqual(prevSortBy, sortBy)) return;

        // Pre-clear if only toggling abs for any sort. Ag-Grid doesn't handle abs and would skip
        if (
            sortBy.some(curr =>
                prevSortBy?.some(
                    prev =>
                        curr.sort === prev.sort && curr.colId === prev.colId && curr.abs != prev.abs
                )
            )
        ) {
            togglingAbsSort = true;
            agApi.applyColumnState({defaultState: {sort: null, sortIndex: null}});
        }

        // Calculate and set new state
        const currState = agApi.getColumnState(),
            newState = [];
        let idx = 0;
        sortBy.forEach(({colId, sort}) => {
            const col = find(currState, {colId});
            if (col) newState.push({colId, sort, sortIndex: idx++});
        });

        agApi.applyColumnState({
            state: newState,
            defaultState: {sort: null, sortIndex: null}
        });

        // Workaround needed for ag v27.
        // https://github.com/xh/hoist-react/issues/2997
        if (togglingAbsSort) {
            agApi.redrawRows();
        }

        this._prevSortBy = sortBy;
    }

    /**
     * @returns the current row expansion state of the grid in a serializable form.
     *      Returned object has keys for StoreRecordIds of top-level, expanded records and values
     *      of either `true` or an object with keys of StoreRecordIds of expanded child records.
     */
    getExpandState(): PlainObject {
        this.throwIfNotReady();

        const expandState = {};
        this.agApi.forEachNode(node => {
            if (!node.allChildrenCount) return;

            if (node.expanded) {
                // Skip if parent is collapsed. Parents are visited before children,
                // so should already be in expandState if expanded.
                const parent = node.parent;
                if (
                    parent &&
                    parent.id !== 'ROOT_NODE_ID' &&
                    !has(expandState, this.getGroupNodePath(parent))
                ) {
                    return;
                }

                // Note use of setWith + customizer - required to ensure that nested nodes are
                // serialized as objects - see https://github.com/xh/hoist-react/issues/3550.
                const path = this.getGroupNodePath(node);
                setWith(expandState, path, true, () => ({}));
            }
        });

        return expandState;
    }

    /**
     * Sets the grid row expansion state
     * @param expandState - grid expand state retrieved via getExpandState()
     */
    setExpandState(expandState: PlainObject) {
        this.throwIfNotReady();

        const {agApi} = this;
        let wasChanged = false;
        agApi.forEachNode(node => {
            if (!node.allChildrenCount) return;

            const path = this.getGroupNodePath(node);
            if (has(expandState, path)) {
                node.expanded = true;
                wasChanged = true;
            }
        });

        if (wasChanged) {
            agApi.onGroupExpandedOrCollapsed();
        }
    }

    /** @returns list of selected row node ids */
    getSelectedRowNodeIds(): string[] {
        this.throwIfNotReady();
        return this.agApi.getSelectedNodes().map(it => it.id);
    }

    /**
     * Sets the selected row node ids. Any rows currently selected which are not in the list will be
     * deselected.
     *
     * @param ids - row node ids to mark as selected
     */
    setSelectedRowNodeIds(ids: string[]) {
        this.throwIfNotReady();

        const {agApi} = this;
        agApi.deselectAll();
        ids.forEach(id => {
            const node = agApi.getRowNode(id);
            if (node) node.setSelected(true);
        });
    }

    /**
     * @returns the id of the first row in the grid, after sorting and filtering, which
     *      has data associated with it (i.e. not a group or other synthetic row).
     */
    getFirstSelectableRowNodeId(): string {
        return this.getFirstSelectableRowNode()?.id;
    }

    /**
     * @returns the first row in the grid, after sorting and filtering, which
     *  has data associated with it (i.e. not a group or other synthetic row).
     */
    getFirstSelectableRowNode(): IRowNode {
        this.throwIfNotReady();

        let ret = null;
        this.agApi.forEachNodeAfterFilterAndSort(node => {
            if (!ret && node.data) {
                ret = node;
            }
        });
        return ret;
    }

    /**
     * Sets the data used for rows which appear pinned to the top of the grid
     * @param data - the data to pin at the top of the grid
     */
    setPinnedTopRowData(data: PlainObject[]) {
        this.throwIfNotReady();
        this.agApi.updateGridOptions({pinnedTopRowData: data});
    }

    /**
     * @returns row data pinned to the top of the grid
     */
    getPinnedTopRowData(): PlainObject[] {
        this.throwIfNotReady();
        return this.getPinnedRowData('Top');
    }

    /**
     * Sets the data used for rows which appear pinned to the bottom of the grid
     * @param data - the data to pin at the bottom of the grid
     */
    setPinnedBottomRowData(data: PlainObject[]) {
        this.throwIfNotReady();
        this.agApi.updateGridOptions({pinnedBottomRowData: data});
    }

    /**
     * @returns row data pinned to the bottom of the grid
     */
    getPinnedBottomRowData(): PlainObject[] {
        this.throwIfNotReady();
        return this.getPinnedRowData('Bottom');
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    handleGridReady({api}) {
        this.logDebug(`Initializing`, this.xhId);
        throwIf(
            this.agApi && this.agApi != api,
            'Attempted to mount a grid on a GridModel that is already in use. ' +
                'Ensure that you are not binding your grid to the wrong model via context.'
        );
        this.agApi = api;
    }

    @action
    handleGridUnmount() {
        this.logDebug(`Un-initializing`, this.xhId);
        this.agApi = null;
    }

    private getPinnedRowData(side: string): PlainObject[] {
        const {agApi} = this,
            count = agApi[`getPinned${side}RowCount`](),
            ret = [];

        for (let i = 0; i < count; ++i) {
            const data = agApi[`getPinned${side}Row`](i).data;
            if (data) ret.push(data);
        }

        return ret;
    }

    private getPivotColumnId(column) {
        return [column.colDef.pivotKeys, column.colDef.pivotValueColumn.colId];
    }

    private getGroupNodePath(node) {
        const buildNodePath = (node, path = []) => {
            // ag-Grid will always have a root node with the id ROOT_NODE_ID in the node parent hierarchy
            // so we need to make sure we don't consider it as part of the path here
            if (node.parent && node.parent.id !== 'ROOT_NODE_ID') {
                buildNodePath(node.parent, path);
            }

            path.push(node.key);
            return path;
        };

        return buildNodePath(node);
    }

    private throwIfNotReady() {
        throwIf(
            !this.isReady,
            "AgGrid is not ready! Make sure to check 'isReady' before attempting this operation!"
        );
    }
}
