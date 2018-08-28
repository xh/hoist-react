/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {StoreSelectionModel} from '@xh/hoist/data';
import {StoreContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {
    castArray,
    cloneDeep,
    defaults,
    find,
    findLast,
    isEmpty,
    isPlainObject,
    isString,
    last,
    orderBy,
    pull,
    remove,
    uniqBy
} from 'lodash';
import {Column} from '@xh/hoist/columns';
import {throwIf, warnIf} from '@xh/hoist/utils/js';
import {ColChooserModel} from './ColChooserModel';
import {GridStateModel} from './GridStateModel';
import {ExportManager} from './ExportManager';

/**
 * Core Model for a Grid, specifying the grid's data store, column definitions,
 * sorting/grouping/selection state, and context menu configuration.
 *
 * This is the primary application entry-point for specifying Grid component options and behavior.
 */
@HoistModel()
export class GridModel {

    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {BaseStore} */
    store = null;
    /** @member {StoreSelectionModel} */
    selModel = null;
    /** @member {GridStateModel} */
    stateModel = null;
    /** @member {ColChooserModel} */
    colChooserModel = null;
    /** @member {function} */
    contextMenuFn = null;
    /** @member {boolean} */
    enableExport = false;
    /** @member {string} */
    exportFilename = 'export';

    //------------------------
    // Observable API
    //------------------------
    /** @member {Column[]} */
    @observable.ref columns = [];
    /** @member {GridSorterDef[]} */
    @observable.ref sortBy = [];
    /** @member {?string} */
    @observable groupBy = null;
    /** @member {boolean} */
    @observable compact = false;
    /** @member {GridApi} */
    @observable.ref agApi = null;

    static defaultContextMenuTokens = [
        'copy',
        'copyWithHeaders',
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
     * @param {(Column[]|Object[])} c.columns - Columns, or configs to create them.
     * @param {(StoreSelectionModel|Object|String)} [c.selModel] - StoreSelectionModel, or a
     *      config or string `mode` with which to create one.
     * @param {(Object|string)} [c.stateModel] - config or string `gridId` for a GridStateModel.
     * @param {?string} [c.emptyText] - text/HTML to display if grid has no records.
     *      Defaults to null, in which case no empty text will be shown.
     * @param {(string|string[]|GridSorterDef|GridSorterDef[])} [c.sortBy] - colId(s) or sorter
     *      config(s) with colId and sort direction.
     * @param {?string} [c.groupBy] - Column ID by which to do full-width row grouping.
     * @param {boolean} [c.compact] - true to render the grid in compact mode.
     * @param {boolean} [c.enableColChooser] - true to setup support for column chooser UI and
     *      install a default context menu item to launch the chooser.
     * @param {boolean} [c.enableExport] - true to install default export context menu items.
     * @param {(function|string)} [c.exportFilename] - filename for exported file,
     *      or a closure to generate one.
     * @param {function} [c.contextMenuFn] - closure returning a StoreContextMenu.
     *      @see StoreContextMenu
     */
    constructor({
        store,
        columns,
        selModel = 'single',
        stateModel = null,
        emptyText = null,
        sortBy = [],
        groupBy = null,
        compact = false,
        enableColChooser = false,
        enableExport = false,
        exportFilename = 'export',
        contextMenuFn = () => this.defaultContextMenu()
    }) {
        this.store = store;
        this.emptyText = emptyText;
        this.enableExport = enableExport;
        this.exportFilename = exportFilename;
        this.contextMenuFn = contextMenuFn;

        this.setColumns(columns);

        if (enableColChooser) {
            this.colChooserModel = new ColChooserModel(this);
        }

        this.setGroupBy(groupBy);
        this.setSortBy(sortBy);
        this.setCompact(compact);

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
        const {store, selModel, sortBy} = this,
            colIds = sortBy.map(it => it.colId),
            sorts = sortBy.map(it => it.sort),
            recs = orderBy(store.records, colIds, sorts);

        if (recs.length) selModel.select(recs[0]);
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

    /**
     * This method is no-op if provided a field without a corresponding column.
     * @param {string} field - colId of field for row grouping, or falsey value to remove grouping.
     */
    @action
    setGroupBy(field) {
        const cols = this.columns,
            groupCol = find(cols, {field});

        if (field && !groupCol) return;

        cols.forEach(it => {
            if (it.rowGroup) {
                it.agOptions.rowGroup = false;
                it.hide = false;
            }
        });

        if (field && groupCol) {
            groupCol.agOptions.rowGroup = true;
            groupCol.hide = true;
        }

        this.columns = [...cols];
    }

    /**
     * This method is no-op if provided any sorters without a corresponding column.
     * @param {(string|string[]|GridSorterDef|GridSorterDef[])} sorters - colId(s) or sorter
     *      config(s) with colId and sort direction.
     */
    @action
    setSortBy(sorters) {
        // Normalize string, and partially specified values
        sorters = castArray(sorters);
        sorters = sorters.map(it => {
            if (isString(it)) it = {colId: it};
            it.sort = it.sort || 'asc';
            return it;
        });

        const sortIsValid = sorters.every(it => find(this.columns, {colId: it.colId}));
        if (!sortIsValid) return;

        this.sortBy = sorters;
    }

    @action
    setCompact(compact) {
        this.compact = compact;
    }

    /** Load the underlying store. */
    loadAsync(...args) {
        return this.store.loadAsync(...args);
    }

    /** Load the underlying store. */
    loadData(...args) {
        return this.store.loadData(...args);
    }

    /** @return {Column[]} */
    cloneColumns() {
        return [...this.columns];
    }

    /** @param {(Column[]|Object[])} cols - Columns, or configs to create them. */
    @action
    setColumns(cols) {
        const columns = this.buildColumnsFromConfigs(cols);

        this.validateColumns(columns);

        this.columns = columns;
    }

    buildColumnsFromConfigs(colConfigs) {
        const cols = colConfigs.map(c => {
            if (c.children) {
                throwIf(!(c.groupId || c.headerName), 'Must specify groupId or headerName for a group column.');
                c.groupId = c.groupId || c.headerName;
                c.children = this.buildColumnsFromConfigs(c.children);
                c.marryChildren = true; // enforce 'sealed' column groups
                return c;
            }

            return c instanceof Column ? c : new Column(c);
        });

        return cols;
    }

    showColChooser() {
        if (this.colChooserModel) {
            this.colChooserModel.open();
        }
    }

    @action
    noteAgColumnStateChanged(agColState) {
        const {columns} = this,
            newCols = [];

        agColState.forEach(agCol => {
            let colAndPath;
            for (let i = 0; !colAndPath && i < columns.length; i++) {
                colAndPath = this.searchChildren(columns[i], agCol);
            }
            this.addLeaf(agCol, colAndPath.column, colAndPath.path, newCols);
        });


        // Force any emptyFlexCol that is last to stay last (avoid user dragging)!
        const emptyFlex = findLast(columns, {colId: 'emptyFlex'});
        if (emptyFlex && last(columns) == emptyFlex && last(newCols) != emptyFlex) {
            pull(newCols, emptyFlex).push(emptyFlex);
        }

        this.columns = newCols;
    }

    //-----------------------
    // Implementation
    //-----------------------
    searchChildren(column, agCol, path = []) {
        if (column.colId == agCol.colId) {
            return {column, path};
        }

        if (column.children) {
            var result = null;
            for (var i = 0; result == null && i < column.children.length; i++) {
                const currPath = cloneDeep(path);
                currPath.push(column.groupId);
                result = this.searchChildren(column.children[i], agCol, currPath);
            }
            return result;
        }
        return null;
    }

    addLeaf(agCol, col, path, newCols) {
        const {columns} = this;

        // An empty path means an upgrouped grid or a top level column
        if (isEmpty(path)) {
            if (!col.flex) col.width = agCol.width;
            newCols.push(col);
            return;
        }

        const topLevelAncestorNode = find(newCols, {groupId: path[0]});

        // means we're adding a leaf to a group we already pushed
        if (topLevelAncestorNode) {
            this.placeInNode(agCol, col, path, topLevelAncestorNode);
        }

        // we've moved to the next top level group in new cols
        if (!topLevelAncestorNode) {
            const existingTopLevelNode = find(columns, {groupId: path[0]}),
                clonedNode = cloneDeep(existingTopLevelNode);

            this.removeLeaves(clonedNode);

            this.placeInNode(agCol, col, path, clonedNode);

            newCols.push(clonedNode);
        }

    }

    removeLeaves(node) {
        remove(node.children, function(it) {
            return !it.children;
        });
        node.children.forEach(it => this.removeLeaves(it));
    }


    placeInNode(agCol, col, path, node) {

        // First item in path is the passed node
        for (var i = 1; i < path.length; i++) {
            node = find(node.children, {groupId: path[i]});
        }

        if (!col.flex) col.width = agCol.width;
        node.children.push(col);
    }

    validateColumns(cols) {
        if (isEmpty(cols)) return;

        // TODO: Need to traverse columns for leaves to do this now......

        // const hasDupes = cols.length != uniqBy(cols, 'colId').length;
        // throwIf(hasDupes, 'All colIds in column collection must be unique.');

        warnIf(
            !cols.some(c => c.flex),
            `No columns have flex set (flex=true). Consider making the last column a flex column, 
            or adding an 'emptyFlexCol' at the end of your columns array.`
        );
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
 * @typedef {Object} GridSorterDef - config for GridModel sorting.
 * @property {string} colId - Column ID on which to sort.
 * @property {string} [sort] - direction to sort - either ['asc', 'desc'] - default asc.
 */
