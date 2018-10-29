/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable, computed} from '@xh/hoist/mobx';
import {StoreSelectionModel} from '@xh/hoist/data';
import {StoreContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {
    castArray,
    defaults,
    findLast,
    isEmpty,
    isPlainObject,
    isString,
    last,
    sortBy,
    pull,
    uniq,
    isNil,
    isFinite,
    map
} from 'lodash';
import {Column, ColumnGroup} from '@xh/hoist/cmp/grid/columns';
import {withDefault, throwIf, warnIf} from '@xh/hoist/utils/js';
import {GridStateModel} from './GridStateModel';
import {ColChooserModel} from './impl/ColChooserModel';
import {GridSorter} from './impl/GridSorter';
import {ExportManager} from './impl/ExportManager';

/**
 * Core Model for a Grid, specifying the grid's data store, column definitions,
 * sorting/grouping/selection state, and context menu configuration.
 *
 * This is the primary application entry-point for specifying Grid component options and behavior.
 *
 * This model also supports nested tree data. To show a tree:
 *   1) Bind this model to a store with hierarchical records.
 *   2) Set `treeMode: true` on this model.
 *   3) Include a single column with `isTreeColumn: true`. This column will provide expand /
 *      collapse controls and indent child columns in addition to displaying its own data.
 *
 */
@HoistModel
export class GridModel {

    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {BaseStore} */
    store = null;
    /** @member {StoreSelectionModel} */
    selModel = null;
    /** @member {boolean} */
    treeMode = false;
    /** @member {GridStateModel} */
    stateModel = null;
    /** @member {ColChooserModel} */
    colChooserModel = null;
    /** @member {function} */
    rowClassFn = null;
    /** @member {function} */
    contextMenuFn = null;
    /** @member {boolean} */
    enableExport = false;
    /** @member {string} */
    exportFilename = 'export';

    //------------------------
    // Observable API
    //------------------------
    /** @member {Object[]} - {@link Column} and {@link ColumnGroup} objects */
    @observable.ref columns = [];
    /** @member {GridSorter[]} */
    @observable.ref sortBy = [];
    /** @member {string[]} */
    @observable groupBy = null;
    /** @member {boolean} */
    @observable compact = false;
    /** @member {GridApi} */
    @observable.ref agApi = null;
    /** @member {ColumnApi} */
    @observable.ref agColumnApi = null;

    static defaultContextMenuTokens = [
        'copy',
        'copyWithHeaders',
        '-',
        'expandCollapseAll',
        '-',
        'exportExcel',
        'exportCsv',
        '-',
        'colChooser'
    ];

    defaultContextMenu = () => {
        return new StoreContextMenu({
            items: GridModel.defaultContextMenuTokens,
            gridModel: this
        });
    };

    /**
     * @param {Object} c - GridModel configuration.
     * @param {BaseStore} c.store - store containing the data for the grid.
     * @param {Object[]} c.columns - {@link Column} or {@link ColumnGroup} configs
     * @param {(boolean)} [c.treeMode] - true if grid is a tree grid (default false).
     * @param {(StoreSelectionModel|Object|String)} [c.selModel] - StoreSelectionModel, or a
     *      config or string `mode` with which to create one.
     * @param {(Object|string)} [c.stateModel] - config or string `gridId` for a GridStateModel.
     * @param {?string} [c.emptyText] - text/HTML to display if grid has no records.
     *      Defaults to null, in which case no empty text will be shown.
     * @param {(string|string[]|Object|Object[])} [c.sortBy] - colId(s) or sorter config(s) with
     *      colId and sort direction.
     * @param {(string|string[])} [c.groupBy] - Column ID(s) by which to do full-width row grouping.
     * @param {boolean} [c.compact] - true to render the grid in compact mode.
     * @param {boolean} [c.enableColChooser] - true to setup support for column chooser UI and
     *      install a default context menu item to launch the chooser.
     * @param {boolean} [c.enableExport] - true to install default export context menu items.
     * @param {(function|string)} [c.exportFilename] - filename for exported file,
     *      or a closure to generate one.
     * @param {function} [c.rowClassFn] - closure to generate css class names for a row.
     *      Should return a string or array of strings. Receives record data as param.
     * @param {function} [c.contextMenuFn] - closure returning a StoreContextMenu.
     * @param {*} [c...rest] - additional data to store
     *      @see StoreContextMenu
     */
    constructor({
        store,
        columns,
        treeMode = false,
        selModel,
        stateModel = null,
        emptyText = null,
        sortBy = [],
        groupBy = null,
        compact = false,
        enableColChooser = false,
        enableExport = false,
        exportFilename = 'export',
        rowClassFn = null,
        contextMenuFn = () => this.defaultContextMenu(),
        ...rest
    }) {
        this.store = store;
        this.treeMode = treeMode;
        this.emptyText = emptyText;
        this.enableExport = enableExport;
        this.exportFilename = exportFilename;
        this.contextMenuFn = contextMenuFn;
        this.rowClassFn = rowClassFn;

        Object.assign(this, rest);

        this.setColumns(columns);

        if (enableColChooser) {
            this.colChooserModel = new ColChooserModel(this);
        }

        this.setGroupBy(groupBy);
        this.setSortBy(sortBy);
        this.setCompact(compact);

        selModel = withDefault(selModel, XH.isMobile ? 'disabled' : 'single');
        this.selModel = this.initSelModel(selModel, store);
        this.stateModel = this.initStateModel(stateModel);
    }

    /**
     * Export grid data using Hoist's server-side export.
     *
     * @param {Object} options
     * @param {string} options.type - type of export - one of ['excel', 'excelTable', 'csv'].
     * @param {(string|function)} [options.filename] - name for exported file or closure to generate.
     */
    export(options = {}) {
        const {type, filename = this.exportFilename} = options;
        new ExportManager().exportAsync(this, filename, type);
    }

    /**
     * Export grid data using ag-Grid's built-in client-side export.
     *
     * @param {string} filename - name for exported file.
     * @param {string} type - type of export - one of ['excel', 'csv'].
     * @param {Object} params - passed to agGrid's export functions.
     */
    localExport(filename, type, params = {}) {
        if (!this.agApi) return;
        defaults(params, {fileName: filename, processCellCallback: this.formatValuesForExport});

        if (type === 'excel') {
            this.agApi.exportDataAsExcel(params);
        } else if (type === 'csv') {
            this.agApi.exportDataAsCsv(params);
        }
    }

    /** Select the first row in the grid. */
    selectFirst() {
        const {agApi, selModel} = this;
        if (agApi) {
            const first = agApi.getDisplayedRowAtIndex(0);
            if (first) selModel.select(first);
        }
    }

    /** Does the grid have any records to show? */
    get empty() {
        return this.store.empty;
    }

    /**
     * Shortcut to the currently selected records (observable).
     * @see StoreSelectionModel.records
     */
    get selection() {
        return this.selModel.records;
    }

    /**
     * Shortcut to a single selected record (observable).
     * Null if multiple records are selected.
     * @see StoreSelectionModel.singleRecord
     */
    get selectedRecord() {
        return this.selModel.singleRecord;
    }

    @action
    setAgApi(agApi) {
        this.agApi = agApi;
    }

    @action
    setAgColumnApi(columnApi) {
        this.agColumnApi = columnApi;
    }

    /**
     * Apply full-width row-level grouping to the grid for the given column ID(s).
     * IDs that do not have a corresponding leaf-level column will be dropped and ignored.
     * @param {(string|string[])} colIds - column ID(s) for row grouping, or falsey value to ungroup.
     */
    @action
    setGroupBy(colIds) {
        colIds = castArray(colIds);

        const cols = this.columns,
            leafCols = this.getLeafColumns(),
            groupCols = leafCols.filter(it => colIds.includes(it.colId)),
            groupColIds = groupCols.map(it => it.colId);

        // Ungroup and re-show any currently grouped columns.
        leafCols.forEach(col => {
            if (col.agOptions.rowGroup) {
                col.agOptions.rowGroup = false;
                col.hidden = false;
            }
        });

        // Group and hide all newly requested columns.
        groupCols.forEach(col => {
            col.agOptions.rowGroup = true;
            col.hidden = true;
        });

        // Set groupBy value based on verified column IDs and flush to grid.
        this.groupBy = groupColIds;
        this.columns = [...cols];
    }

    /** Expand all parent rows in grouped or tree grid. (Note, this is recursive for trees!) */
    expandAll() {
        const {agApi} = this;
        if (agApi) {
            agApi.expandAll();
        }
    }

    /** Collapse all parent rows in grouped or tree grid. */
    collapseAll() {
        const {agApi} = this;
        if (agApi) {
            agApi.collapseAll();
        }
    }

    /**
     * This method is no-op if provided any sorters without a corresponding column.
     * @param {(string|string[]|Object|Object[])} sorters - colId(s), GridSorter config(s)
     *      or GridSorter strings.
     */
    @action
    setSortBy(sorters) {
        sorters = castArray(sorters);
        sorters = sorters.map(it => {
            if (it instanceof GridSorter) return it;
            return GridSorter.parse(it);
        });

        const invalidSorters = sorters.filter(it => !this.findColumn(this.columns, it.colId));
        if (invalidSorters.length) {
            console.warn('GridSorter colId not found in grid columns', invalidSorters);
            return;
        }

        this.sortBy = sorters;
    }

    @action
    setCompact(compact) {
        this.compact = compact;
    }

    /** Return the minimum row height specified by the columns (if any) */
    @computed
    get columnRowHeight() {
        const ret = Math.max(...map(this.columns, 'rowHeight').filter(isFinite));
        return isFinite(ret) ? ret : null;
    }

    /** Load the underlying store. */
    loadAsync(...args) {
        return this.store.loadAsync(...args);
    }

    /** Load the underlying store. */
    loadData(...args) {
        return this.store.loadData(...args);
    }

    /** @param {Object[]} colConfigs - {@link Column} or {@link ColumnGroup} configs. */
    @action
    setColumns(colConfigs) {
        throwIf(
            colConfigs.some(c => !isPlainObject(c)),
            'GridModel only accepts plain objects for Column or ColumnGroup configs'
        );

        const columns = colConfigs.map(c => this.buildColumn(c));

        this.validateColumns(columns);

        this.columns = columns;
    }

    showColChooser() {
        if (this.colChooserModel) {
            this.colChooserModel.open();
        }
    }

    noteAgColumnStateChanged(agColState) {
        const colChanges = agColState.map(({colId, width, hide}) => {
            const col = this.findColumn(this.columns, colId);
            return {
                colId,
                hidden: hide,
                width: col.flex ? undefined : width
            };
        });

        this.applyColumnChanges(colChanges);
    }

    /**
     * This method will update the current column definition. Throws an exception if any of the
     * columns provided in colChanges are not present in the current column list.
     *
     * Note: Column ordering is determined by the individual (leaf-level) columns in state.
     * This means that if a column has been redefined to a new column group, that entire group may
     * be moved to a new index.
     *
     * @param {ColumnState[]} colChanges - changes to apply to the columns. If all leaf columns are
     *      represented in these changes then the sort order will be applied as well.
     */
    @action
    applyColumnChanges(colChanges) {
        let {columns} = this,
            newCols = [...columns];

        throwIf(colChanges.some(({colId}) => !this.findColumn(columns, colId)),
            'Invalid columns detected in column changes!');

        // 1) Update any width or visibility changes
        colChanges.forEach(change => {
            const col = this.findColumn(newCols, change.colId);

            if (!isNil(change.width)) col.width = change.width;
            if (!isNil(change.hidden)) col.hidden = change.hidden;
        });

        // 2) If the changes provided is a full list of leaf columns, synchronize the sort order
        const leafCols = this.getLeafColumns();
        if (colChanges.length === leafCols.length) {
            // 2.a) Mark (potentially changed) sort order
            colChanges.forEach((change, index) => {
                const col = this.findColumn(newCols, change.colId);
                col._sortOrder = index;
            });

            // 2.b) Install implied group sort orders and sort
            newCols.forEach(it => this.markGroupSortOrder(it));
            newCols = this.sortColumns(newCols);

            // 2.c) Force any emptyFlexCol that is last to stay last (avoid user dragging)!
            const emptyFlex = findLast(newCols, {colId: 'emptyFlex'});
            if (emptyFlex && last(columns).colId == 'emptyFlex' && last(newCols) != emptyFlex) {
                pull(newCols, emptyFlex).push(emptyFlex);
            }
        }

        this.columns = newCols;
    }

    getLeafColumns() {
        return this.gatherLeaves(this.columns);
    }

    findColumn(cols, id) {
        for (let col of cols) {
            if (col.children) {
                const ret = this.findColumn(col.children, id);
                if (ret) return ret;
            } else {
                if (col.colId == id) return col;
            }
        }
        return null;
    }

    buildColumn(c) {
        return c.children ? new ColumnGroup(c, this) : new Column(c, this);
    }

    //-----------------------
    // Implementation
    //-----------------------
    gatherLeaves(columns, leaves = []) {
        columns.forEach(col => {
            if (col.groupId) this.gatherLeaves(col.children, leaves);
            if (col.colId) leaves.push(col);
        });

        return leaves;
    }

    markGroupSortOrder(col) {
        if (col.groupId) {
            col.children.forEach(child => this.markGroupSortOrder(child));
            col._sortOrder = col.children[0]._sortOrder;
        }
    }

    sortColumns(columns) {
        columns.forEach(col => {
            if (col.children) {
                col.children = this.sortColumns(col.children);
            }
        });

        return sortBy(columns, [it => it._sortOrder]);
    }

    validateColumns(cols) {
        if (isEmpty(cols)) return;

        const {groupIds, colIds} = this.collectIds(cols);

        const colsHaveDupes = colIds.length != uniq(colIds).length;
        throwIf(colsHaveDupes, 'All colIds in column collection must be unique.');

        const groupColsHaveDupes = groupIds.length != uniq(groupIds).length;
        throwIf(groupColsHaveDupes, 'All groupIds in column collection must be unique.');

        const treeCols = cols.filter(it => it.isTreeColumn);
        warnIf(
            this.treeMode && treeCols.length != 1,
            'Grids in treeMode should include exactly one column with isTreeColumn:true.'
        );

        warnIf(
            !cols.some(c => c.flex),
            `No columns have flex set (flex=true). Consider making the last column a flex column, 
            or adding an 'emptyFlexCol' at the end of your columns array.`
        );
    }

    collectIds(cols, groupIds = [], colIds = []) {
        cols.forEach(col => {
            if (col.colId) colIds.push(col.colId);
            if (col.groupId) {
                groupIds.push(col.groupId);
                this.collectIds(col.children, groupIds, colIds);
            }
        });
        return {groupIds, colIds};
    }

    formatValuesForExport(params) {
        const value = params.value,
            fmt = params.column.colDef.valueFormatter;
        if (value !== null && fmt) {
            return fmt(value);
        } else {
            return value;
        }
    }

    initSelModel(selModel, store) {
        if (selModel instanceof StoreSelectionModel) {
            return selModel;
        }

        if (isPlainObject(selModel)) {
            return new StoreSelectionModel(defaults(selModel, {store}));
        }

        // Assume its just the mode...
        let mode = 'single';
        if (isString(selModel)) {
            mode = selModel;
        } else if (selModel === null) {
            mode = 'disabled';
        }

        return new StoreSelectionModel({mode, store});
    }

    initStateModel(stateModel) {
        let ret = null;
        if (isPlainObject(stateModel)) {
            ret = new GridStateModel(stateModel);
        } else if (isString(stateModel)) {
            ret = new GridStateModel({gridId: stateModel});
        }
        if (ret) ret.init(this);

        return ret;
    }

    destroy() {
        XH.safeDestroy(this.colChooserModel, this.stateModel);
    }
}

/**
 * @typedef {Object} ColumnState
 * @property {string} colId - unique identifier of the column
 * @property {number} [width] - new width to set for the column
 * @property {boolean} [hidden] - visibility of the column
 */