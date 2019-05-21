import {HoistModel} from '@xh/hoist/core';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {has, isNil, isEmpty, cloneDeep, isArray, last, isEqual} from 'lodash';
import {warnIf} from '../../utils/js';

/**
 * Model for an AgGrid, provides reactive support for setting grid styling as well as access to the
 * ag-Grid API and Column API references for interacting with ag-Grid.
 *
 * Also provides a series of utility methods that are generally useful when managing grid state. This
 * includes the ability to get and set the full state of the grid in a serializable form, allowing
 * applications to save "views" of the grid.
 */
@HoistModel
export class AgGridModel {
    static AUTO_GROUP_COL_ID = 'ag-Grid-AutoColumn';

    //------------------------
    // Grid Style
    //------------------------
    /** @member {boolean} */
    @bindable compact;
    /** @member {boolean} */
    @bindable rowBorders;
    /** @member {boolean} */
    @bindable stripeRows;
    /** @member {boolean} */
    @bindable showHover;
    /** @member {boolean} */
    @bindable showCellFocus;

    /** @member {GridApi} */
    @observable.ref agApi = null;
    /** @member {ColumnApi} */
    @observable.ref agColumnApi = null;

    /**
     * @param {Object} c - AgGridModel configuration.
     * @param {boolean} [c.compact] - true to render with a smaller font size and tighter padding.
     * @param {boolean} [c.rowBorders] - true to render row borders.
     * @param {boolean} [c.stripeRows] - true (default) to use alternating backgrounds for rows.
     * @param {boolean} [c.showHover] - true to highlight the currently hovered row.
     * @param {boolean} [c.showCellFocus] - true to highlight the focused cell with a border.
     */
    constructor({
        compact = false,
        showHover = false,
        rowBorders = false,
        stripeRows = true,
        showCellFocus = false
    } = {}) {
        this.compact = compact;
        this.showHover = showHover;
        this.rowBorders = rowBorders;
        this.stripeRows = stripeRows;
        this.showCellFocus = showCellFocus;

        this.addReaction({
            track: () => this.compact,
            run: () => {
                if (this.agApi) this.agApi.resetRowHeights();
            }
        });
    }

    /**
     * Retrieves the current state of the grid via ag-Grid APIs. This state is returned in a
     * serializable form and can be later restored via setState.
     *
     * @param {Object} c - options for which state is retrieved.
     * @param {boolean} c.excludeColumnState - true to exclude the column state
     * @param {boolean} c.excludeSort - true to exclude the sort state
     * @param {boolean} c.excludeExpand - true to exclude the expand state
     * @param {boolean} c.excludeFilter - true to exclude the filter state
     * @param {boolean} c.excludeMiscState - true to exclude any additional miscellaneous state
     *
     * @returns {AgGridState} - the current state of the grid
     */
    getState({excludeColumnState, excludeSort, excludeExpand, excludeFilter, excludeMiscState} = {}) {
        const columnState = excludeColumnState ? undefined : this.getColumnState(),
            sortState = excludeSort ? undefined : this.getSortState(),
            expandState = excludeExpand ? undefined : this.getExpandState(),
            filterState = excludeFilter ? undefined : this.getFilterState(),
            miscState = excludeMiscState ? undefined : this.getMiscState();

        return {
            columnState,
            sortState,
            expandState,
            filterState,
            miscState
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
        return {
            panelId: this.agApi.getOpenedToolPanel()
        };
    }

    /**
     * Sets the grid state which doesn't fit into the other buckets.
     * @param {AgGridMiscState} miscState
     */
    setMiscState(miscState) {
        const {agApi} = this,
            {panelId} = miscState;

        if (isNil(panelId)) {
            agApi.closeToolPanel();
        } else {
            agApi.openToolPanel(panelId);
        }
    }

    /**
     * @returns {Object[]} - current filter state of the grid. @see https://www.ag-grid.com/javascript-grid-filtering/#get-set-all-filter-models
     */
    getFilterState() {
        const {agApi} = this;
        return agApi.getFilterModel();
    }

    /**
     * Sets the grid filter state. Note that this state may be data-dependent, depending on the types
     * of filter being used.
     *
     * @param {Object[]} filterState
     */
    setFilterState(filterState) {
        const {agApi} = this;

        agApi.setFilterModel(filterState);
        agApi.onFilterChanged();
    }

    /**
     * @returns {Object[]} - current sort state of the grid. @see https://www.ag-grid.com/javascript-grid-sorting/#sorting-api
     */
    getSortState() {
        const {agApi, agColumnApi} = this,
            isPivot = agColumnApi.isPivotMode();

        // When we have pivot columns we need to make sure we store the path to the sorted column
        // using the pivot keys and value column id, instead of using the auto-generate secondary
        // column id as this could be different with different data or even with the same data based
        // on the state of the grid when pivot mode was turned on
        let sortModel = agApi.getSortModel();
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

        // Remove any invalid columns, ag-Grid does not like when when setting state with column ids
        // that it does not know about.
        columns = columns.filter(it => validColIds.includes(it.colId));

        agColumnApi.setColumnState(columns);
    }

    /**
     * @returns {Object} - the current row expansion state of the grid in a serializable form
     */
    getExpandState() {
        const expandState = {};
        this.agApi.forEachNode(node => {
            if (!node.group) return;

            const {field, key} = node;
            if (!has(expandState, field)) {
                expandState[field] = {};
            }

            expandState[field][key] = node.expanded;
        });

        return expandState;
    }

    /**
     * Sets the grid row expansion state
     * @param {Object} expandState - grid expand state retrieved via getExpandState()
     */
    setExpandState(expandState) {
        const {agApi} = this;
        let wasChanged = false;
        agApi.forEachNode(node => {
            if (!node.group) return;

            const {field, key} = node,
                expanded = expandState[field] ? !!expandState[field][key] : false;

            if (node.expanded !== expanded) {
                node.expanded = expanded;
                wasChanged = true;
            }
        });

        if (wasChanged) {
            agApi.onGroupExpandedOrCollapsed();
        }
    }

    /** @returns {(string[]|number[])} - list of selected row node ids */
    getSelectedRowNodeIds() {
        return this.agApi.getSelectedRows().map(it => it.id);
    }

    /**
     * Sets the selected row node ids. Any rows currently selected which are not in the list will be
     * deselected.
     * @param ids {(string[]|number[])} - row node ids to mark as selected
     */
    setSelectedRowNodeIds(ids) {
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
        let id = null;
        this.agApi.forEachNodeAfterFilterAndSort(node => {
            if (isNil(id) && node.data) {
                id = node.id;
            }
        });
        return id;
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    init({api, columnApi}) {
        warnIf(!isNil(this.agApi),
            'AgGridModel is being re-initialized! AgGrid component must have been re-rendered!');

        this.agApi = api;
        this.agColumnApi = columnApi;
    }

    getPivotColumnId(column) {
        return [...column.colDef.pivotKeys, column.colDef.pivotValueColumn.colId];
    }
}

/**
 * @typedef {Object} AgGridColumnState
 * @param {boolean} isPivot - true if pivot mode is enabled
 * @param {Object[]} - state of each column in the grid. @see https://www.ag-grid.com/javascript-grid-column-definitions/#saving-and-restoring-column-state
 */

/**
 * @typedef {Object} AgGridColumnSortState
 * @param {string} colId
 * @param {string} direction
 */

/**
 * @typedef {Object} AgGridMiscState
 * @param {string} panelId - identifier of the currently open tool panel in the side bar
 */

/**
 * @typedef {Object} AgGridState
 * @param {AgGridColumnState} [columnState]
 * @param {AgGridColumnSortState[]} [sortState]
 * @param {Object} [expandState]
 * @param {Object[]} [filterState]
 * @param {AgGridMiscState} [miscState]
 */