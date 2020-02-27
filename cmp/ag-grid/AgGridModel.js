/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {cloneDeep, has, isArray, isEmpty, isEqual, isNil, last, set, startCase} from 'lodash';
import {throwIf, warnIf} from '@xh/hoist/utils/js';
import {runInAction} from 'mobx';

/**
 * Model for an AgGrid, provides reactive support for setting grid styling as well as access to the
 * ag-Grid API and Column API references for interacting with ag-Grid.
 *
 * Also provides a series of utility methods that are generally useful when managing grid state.
 * This includes the ability to get and set the full state of the grid in a serializable form,
 * allowing applications to save "views" of the grid.
 */
@HoistModel
export class AgGridModel {
    static AUTO_GROUP_COL_ID = 'ag-Grid-AutoColumn';

    //------------------------
    // Grid Style
    //------------------------
    /** @member {string} */
    @bindable sizingMode;
    /** @member {boolean} */
    @bindable rowBorders;
    /** @member {boolean} */
    @bindable stripeRows;
    /** @member {boolean} */
    @bindable cellBorders;
    /** @member {boolean} */
    @bindable showHover;
    /** @member {boolean} */
    @bindable showCellFocus;

    /** @member {GridApi} */
    @observable.ref agApi = null;
    /** @member {ColumnApi} */
    @observable.ref agColumnApi = null;

    /**
     * @param {Object} [c] - AgGridModel configuration.
     * @param {string} [c.sizingMode] - one of large, standard, compact, tiny
     * @param {boolean} [c.showHover] - true to highlight the currently hovered row.
     * @param {boolean} [c.rowBorders] - true to render row borders.
     * @param {boolean} [c.cellBorders] - true to render cell borders.
     * @param {boolean} [c.stripeRows] - true (default) to use alternating backgrounds for rows.
     * @param {boolean} [c.showCellFocus] - true to highlight the focused cell with a border.
     */
    constructor({
        sizingMode = 'standard',
        showHover = false,
        rowBorders = false,
        cellBorders = false,
        stripeRows = true,
        showCellFocus = false,
        compact
    } = {}) {
        warnIf(compact !== undefined, "The 'compact' config has been deprecated. Use 'sizingMode' instead");
        if (compact) sizingMode = 'compact';

        this.sizingMode = sizingMode;
        this.showHover = showHover;
        this.rowBorders = rowBorders;
        this.cellBorders = cellBorders;
        this.stripeRows = stripeRows;
        this.showCellFocus = showCellFocus;

        this.addReaction({
            track: () => this.sizingMode,
            run: () => {
                const api = this.agApi;
                if (this.isReady) {
                    api.resetRowHeights();
                }
            }
        });
        this.addReaction({
            when: () => !isNil(this.agApi),
            run: () => runInAction(() => this.isReady = true),
            delay: 1
        });
    }

    /** true if the grid fully initialized and its state can be queried/mutated */
    @observable isReady = false;

    /**
     * Retrieves the current state of the grid via ag-Grid APIs. This state is returned in a
     * serializable form and can be later restored via setState.
     *
     * @param {Object} [opts] - options for which state is retrieved.
     * @param {boolean} [opts.excludeColumnState] - true to exclude the column state
     * @param {boolean} [opts.excludeSort] - true to exclude the sort state
     * @param {boolean} [opts.excludeExpand] - true to exclude the expand state
     * @param {boolean} [opts.excludeFilter] - true to exclude the filter state
     * @param {boolean} [opts.excludeMiscState] - true to exclude any additional miscellaneous state
     * @returns {AgGridState} - the current state of the grid
     */
    getState(opts = {}) {
        this.throwIfNotReady();

        const errors = {},
            getStateChunk = (type) => {
                if (opts[`exclude${startCase(type)}State`]) return undefined;

                try {
                    return this[`get${startCase(type)}State`]();
                } catch (err) {
                    console.warn(`Encountered errors retrieving ${type} state:`, err);
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
     * has been loaded via agApi.setRowData
     *
     * @param {AgGridState} state
     */
    setState(state) {
        this.throwIfNotReady();

        const {columnState, sortState, expandState, filterState, miscState} = state;
        if (columnState) this.setColumnState(columnState);
        if (sortState) this.setSortState(sortState);
        if (expandState) this.setExpandState(expandState);
        if (filterState) this.setFilterState(filterState);
        if (miscState) this.setMiscState(miscState);
    }

    /**
     * @returns {AgGridMiscState}
     */
    getMiscState() {
        this.throwIfNotReady();

        return {
            panelId: this.agApi.getOpenedToolPanel()
        };
    }

    /**
     * Sets the grid state which doesn't fit into the other buckets.
     * @param {AgGridMiscState} miscState
     */
    setMiscState(miscState) {
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
     * @returns {Object[]} - current filter state of the grid.
     *      @see https://www.ag-grid.com/javascript-grid-filtering/#get-set-all-filter-models
     */
    getFilterState() {
        this.throwIfNotReady();

        const {agApi} = this;
        return agApi.getFilterModel();
    }

    /**
     * Sets the grid filter state.
     * Note that this state may be data-dependent, depending on the types of filter being used.
     *
     * @param {Object[]} filterState
     */
    setFilterState(filterState) {
        this.throwIfNotReady();

        const {agApi} = this;

        agApi.setFilterModel(filterState);
        agApi.onFilterChanged();
    }

    /**
     * @returns {Object[]} - current sort state of the grid.
     *      @see https://www.ag-grid.com/javascript-grid-sorting/#sorting-api
     */
    getSortState() {
        this.throwIfNotReady();

        const {agApi, agColumnApi} = this,
            isPivot = agColumnApi.isPivotMode();

        let sortModel = agApi.getSortModel();

        // When we have pivot columns we need to make sure we store the path to the sorted column
        // using the pivot keys and value column id, instead of using the auto-generate secondary
        // column id as this could be different with different data or even with the same data based
        // on the state of the grid when pivot mode was enabled.
        if (isPivot && !isEmpty(agColumnApi.getPivotColumns())) {
            // ag-Grid may have left sort state in the model from before pivot mode was activated,
            // which is not representative of the current grid state, so we need to remove any sorts
            // on non-pivot columns
            sortModel = sortModel.filter(it => it.colId.startsWith('pivot_'));

            const secondaryCols = agColumnApi.getSecondaryColumns();
            sortModel.forEach(sort => {
                const col = secondaryCols.find(it => it.colId === sort.colId);
                sort.colId = this.getPivotColumnId(col);
            });
        }

        return sortModel;
    }

    /**
     * Sets the grid sort state.
     * @param {Object[]} sortState
     */
    setSortState(sortState) {
        this.throwIfNotReady();

        const sortModel = cloneDeep(sortState),
            {agApi, agColumnApi} = this,
            isPivot = agColumnApi.isPivotMode(),
            havePivotCols = !isEmpty(agColumnApi.getPivotColumns());

        sortModel.forEach(sort => {
            if (isArray(sort.colId)) {
                if (isPivot && havePivotCols) {
                    // Find the appropriate secondary column
                    const secondaryCols = agColumnApi.getSecondaryColumns(),
                        col = secondaryCols.find(
                            it => isEqual(sort.colId, this.getPivotColumnId(it)));

                    if (col) {
                        sort.colId = col.colId;
                    } else {
                        console.warn(
                            'Could not find a secondary column to associate with the pivot column path',
                            sort.colId);
                    }
                } else {
                    sort.colId = last(sort.colId);
                }
            }
        });

        agApi.setSortModel(sortModel);
        agApi.onSortChanged();
    }

    /**
     * @returns {AgGridColumnState} - current column state of the grid, including pivot mode
     */
    getColumnState() {
        this.throwIfNotReady();

        const {agColumnApi} = this;
        return {
            isPivot: agColumnApi.isPivotMode(),
            columns: agColumnApi.getColumnState()
        };
    }

    /**
     * Sets the columns state of the grid
     * @param {AgGridColumnState} colState
     */
    setColumnState(colState) {
        this.throwIfNotReady();

        const {agColumnApi} = this,
            validColIds = [
                AgGridModel.AUTO_GROUP_COL_ID,
                ...agColumnApi.getAllColumns().map(it => it.colId)
            ];

        let {isPivot, columns} = colState;
        agColumnApi.setPivotMode(isPivot);

        if (isPivot && columns.some(it => !isNil(it.pivotIndex) && it.pivotIndex >= 0)) {
            // Exclude the auto group column as this causes issues with ag-grid when in pivot mode
            columns = columns.filter(it => it.colId !== AgGridModel.AUTO_GROUP_COL_ID);
        }

        // Remove invalid columns. ag-Grid does not like calls to set state with unknown column IDs.
        columns = columns.filter(it => validColIds.includes(it.colId));

        agColumnApi.setColumnState(columns);
    }

    /**
     * @returns {Object} - the current row expansion state of the grid in a serializable form
     */
    getExpandState() {
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

                const path = this.getGroupNodePath(node);
                set(expandState, path, true);
            }
        });

        return expandState;
    }

    /**
     * Sets the grid row expansion state
     * @param {Object} expandState - grid expand state retrieved via getExpandState()
     */
    setExpandState(expandState) {
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

    /** @returns {(string[]|number[])} - list of selected row node ids */
    getSelectedRowNodeIds() {
        this.throwIfNotReady();

        return this.agApi.getSelectedRows().map(it => it.id);
    }

    /**
     * Sets the selected row node ids. Any rows currently selected which are not in the list will be
     * deselected.
     * @param ids {(string[]|number[])} - row node ids to mark as selected
     */
    setSelectedRowNodeIds(ids) {
        this.throwIfNotReady();

        const {agApi} = this;
        agApi.deselectAll();
        ids.forEach(id => {
            const node = agApi.getRowNode(id);
            if (node) node.setSelected(true);
        });
    }

    /**
     * @returns {Number} - the id of the first row in the grid, after sorting and filtering, which
     *      has data associated with it (i.e. not a group or other synthetic row).
     */
    getFirstSelectableRowNodeId() {
        this.throwIfNotReady();

        let id = null;
        this.agApi.forEachNodeAfterFilterAndSort(node => {
            if (isNil(id) && node.data) {
                id = node.id;
            }
        });
        return id;
    }

    /**
     * Sets the data used for rows which appear pinned to the top of the grid
     * @param {Object[]} data - the data to pin at the top of the grid
     */
    setPinnedTopRowData(data) {
        this.throwIfNotReady();
        this.agApi.setPinnedTopRowData(data);
    }

    /**
     * @returns {Array} - row data pinned to the top of the grid
     */
    getPinnedTopRowData() {
        this.throwIfNotReady();
        return this.getPinnedRowData('Top');
    }

    /**
     * Sets the data used for rows which appear pinned to the bottom of the grid
     * @param {Object[]} data - the data to pin at the bottom of the grid
     */
    setPinnedBottomRowData(data) {
        this.throwIfNotReady();
        this.agApi.setPinnedBottomRowData(data);
    }

    /**
     * @returns {Array} - row data pinned to the bottom of the grid
     */
    getPinnedBottomRowData() {
        this.throwIfNotReady();
        return this.getPinnedRowData('Bottom');
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    handleGridReady({api, columnApi}) {
        console.debug('AgGridModel Initializing!');
        this.agApi = api;
        this.agColumnApi = columnApi;
    }

    @action
    handleGridUnmount() {
        console.debug('AgGridModel Uninitializing!');
        this.agApi = null;
        this.agColumnApi = null;
    }

    getPinnedRowData(side) {
        const {agApi} = this,
            count = agApi[`getPinned${side}RowCount`](),
            ret = [];

        for (let i = 0; i < count; ++i) {
            const data = agApi[`getPinned${side}Row`](i).data;
            if (data) ret.push(data);
        }

        return ret;

    }

    getPivotColumnId(column) {
        return [...column.colDef.pivotKeys, column.colDef.pivotValueColumn.colId];
    }

    getGroupNodePath(node) {
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

    throwIfNotReady() {
        throwIf(!this.isReady, 'AgGrid is not ready! Make sure to check \'isReady\' before attempting this operation!');
    }
}

/**
 * @typedef {Object} AgGridColumnState
 * @property {boolean} isPivot - true if pivot mode is enabled
 * @property {Object[]} columns - state of each column in the grid
 *      @see https://www.ag-grid.com/javascript-grid-column-definitions/#saving-and-restoring-column-state
 */

/**
 * @typedef {Object} AgGridColumnSortState
 * @property {string} colId
 * @property {string} direction
 */

/**
 * @typedef {Object} AgGridMiscState
 * @property {string} panelId - identifier of the currently open tool panel in the side bar
 */

/**
 * @typedef {Object} AgGridState
 * @property {AgGridColumnState} [columnState]
 * @property {AgGridColumnSortState[]} [sortState]
 * @property {Object} [expandState]
 * @property {Object[]} [filterState]
 * @property {AgGridMiscState} [miscState]
 */
