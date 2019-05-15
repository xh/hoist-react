import {HoistModel} from '@xh/hoist/core';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {has, isNil, isEmpty, cloneDeep, isArray, last, isEqual} from 'lodash';
import {warnIf} from '../../utils/js';

/**
 * Model for an AgGrid, provides reactive support for setting grid styling as well as access to the
 * ag-Grid API and Column API references for interacting with ag-Grid.
 *
 * Also provides a series of utility methods that are generally useful when managing grid state.
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

    getState({excludeSort, excludeExpand, excludeFilter, excludeSideBarState} = {}) {
        const {agColumnApi} = this,
            pivotMode = agColumnApi.isPivotMode(),
            colState = this.getColumnState(),
            sortState = excludeSort ? undefined : this.getSortState(),
            expandState = excludeExpand ? undefined : this.getExpandState(),
            filterState = excludeFilter ? undefined : this.getFilterState(),
            sideBarState = excludeSideBarState ? undefined : this.getSideBarState();

        return {
            pivotMode,
            colState,
            sortState,
            expandState,
            filterState,
            sideBarState
        };
    }

    setState({pivotMode, colState, sortState, expandState, filterState, sideBarState}) {
        const {agColumnApi} = this;

        agColumnApi.setPivotMode(pivotMode);
        this.setColumnState(colState);

        if (sortState) this.setSortState(sortState);
        if (expandState) this.setExpandState(expandState);
        if (filterState) this.setFilterState(filterState);
        if (sideBarState) this.setSideBarState(sideBarState);
    }

    getSideBarState() {
        return {
            panelId: this.agApi.getOpenedToolPanel()
        };
    }

    setSideBarState({panelId}) {
        const {agApi} = this;
        if (isNil(panelId)) {
            agApi.closeToolPanel();
        } else {
            agApi.openToolPanel(panelId);
        }
    }

    getFilterState() {
        const {agApi} = this;
        return agApi.getFilterModel();
    }

    setFilterState(filterState) {
        const {agApi} = this;

        // TODO: Validate the filter state? Need to do more testing with what happens of the column is invalid
        agApi.setFilterModel(filterState);
        agApi.onFilterChanged();
    }

    getSortState() {
        const {agApi, agColumnApi} = this,
            sortModel = agApi.getSortModel(),
            isPivot = agColumnApi.isPivotMode();

        // When we have pivot columns we need to make sure we store the path to the sorted column
        // using the pivot keys and value column id, instead of using the auto-generate secondary
        // column id as this could be different with different data or even with the same data based
        // on the state of the grid when pivot mode was turned on
        if (isPivot && !isEmpty(agColumnApi.getPivotColumns())) {
            const secondaryCols = agColumnApi.getSecondaryColumns();

            sortModel.forEach(sort => {
                const col = secondaryCols.find(it => it.colId === sort.colId);
                sort.colId = this.getPivotColumnId(col);
            });
        }

        return sortModel;
    }

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
                        // TODO: What to do in this case? Exclude this sort?
                        console.warn(
                            'Could not find a secondary column to associate with the pivot column path',
                            sort.colId);
                    }
                } else {
                    // TODO: Should we just exclude this sort in this case? If not we need to deal with dupe col ids
                    sort.colId = last(sort.colId);
                }
            }
        });

        // TODO: Validate the sort model before setting
        //       1. Remove invalid columns?
        //       2. Remove duplicate column entries

        agApi.setSortModel(sortModel);
        agApi.onSortChanged();
    }

    getColumnState() {
        const {agColumnApi} = this;
        return agColumnApi.getColumnState();
    }

    setColumnState(colState) {
        const {agColumnApi} = this,
            isPivot = agColumnApi.isPivotMode(),
            validColIds = [
                AgGridModel.AUTO_GROUP_COL_ID,
                ...agColumnApi.getAllColumns().map(it => it.colId)];

        if (isPivot && colState.some(it => !isNil(it.pivotIndex) && it.pivotIndex >= 0)) {
            // Exclude the auto group column as this causes issues with ag-grid when in pivot mode
            colState = colState.filter(it => it.colId !== AgGridModel.AUTO_GROUP_COL_ID);
        }

        // Remove any invalid columns, ag-Grid does not like when when setting state with column ids
        // that it does not know about.
        colState = colState.filter(it => validColIds.includes(it.colId));

        agColumnApi.setColumnState(colState);
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