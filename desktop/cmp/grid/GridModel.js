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
                throwIf(!isNaN(c.groupId), 'Group columns must be provided a groupId that is not a number.');
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

    // dothething(agCol, colPath, currentLevel, pathIdx, oldColsAtCurrentLvl) {
    //
    //     // node belongs at this level
    //     if (isEmpty(colPath) || !isNan(colPath[pathIdx])) {
    //         const col = find(oldColsAtCurrentLvl, {colId: agCol.colId});
    //         if (!col.flex) col.width = agCol.actualWidth;
    //         currentLevel.push(col);
    //     }
    //
    //     // look for existing col at this level
    //     const groupCol = find(currentLevel, {groupId: colPath[pathIdx]});
    //
    //     if (!groupCol) {
    //         // we have yet to add the node
    //         const theFoundGroup = find(oldColsAtCurrentLvl, {groupId: colPath[pathIdx]});
    //         this.dothething(agCol, colPath, theFoundGroup.children, );
    //         currentLevel.push(theFoundGroup)
    //     } else {
    //         // we have this anecestor node and need to go a deeper to push this col
    //         pathIdx++
    //
    //     }
    //
    //
    //     return currentLevel
    // }

    addLeaf(agCol, path, newCols) {
        const {columns} = this;

        // An empty path means an upgrouped grid and a column with a top level auto-gen ancestor is a leaf
        if (isEmpty(path) || this.isDummyParent(path[0])) {
            const col = find(columns, {colId: agCol.colId});
            if (!col.flex) col.width = agCol.actualWidth;
            newCols.push(col);
            return;
        }

        const topLevelNode = find(newCols, {groupId: path[0]});

        // means we're adding a leaf to a group we already pushed
        // if (topLevelNode) {
        //     let level = topLevelNode;
        //     for (let i = 1; this.isDummyParent(path[i]); i++) {
        //         level = find(level.children, {groupId: path[i]});
        //     }
        // }

        // we've moved to the next top level group in new cols
        if (!topLevelNode) {
            const prevTopLevelNode = find(columns, {groupId: path[0]}),
                clonedNode = cloneDeep(prevTopLevelNode);

            this.removeLeaves(clonedNode);
            this.findColAndPlaceInNode(agCol, prevTopLevelNode);

            newCols.push(clonedNode);
        }

    }

    findColAndPlaceInNode(agCol, path, node) {
        const {columns} = this;

        var col = find(columns, {groupId: path[0]});
        for (let i = 1; i < path.length; i++) {
            if (this.isDummyParent(path[i])) {
                break;
            }
            col = find(col.children, {groupId: path[i]}); // will we always have children?
        }


        if (!col.flex) col.width = agCol.actualWidth;



    }

    removeLeaves(node) {
        remove(node.children, function(it) {
            return !it.children;
        });
        node.children.forEach(it => this.kickChildrenOut(it));
    }

    isDummyParent(id) {
        return !isNaN(id);
    }

    @action
    noteAgColumnStateChanged(agGridColumns) {
        const {columns} = this;
        const newCols = [];

        agGridColumns.forEach(agCol => {
            const colPath = this.getTreePath(agCol, []);

            this.addLeaf(agCol, colPath, newCols);

        })

        // // Gather cols in correct order, and apply updated widths.
        // let newCols = agGridColumns.map(agCol => {
        //     const col = find(columns, {colId: agCol.colId}) ;
        //     if (!col.flex) col.width = agCol.actualWidth;
        //     return col;
        // });
        //


        // Force any emptyFlexCol that is last to stay last (avoid user dragging)!
        const emptyFlex = findLast(columns, {colId: 'emptyFlex'});
        if (emptyFlex && last(columns) == emptyFlex && last(newCols) != emptyFlex) {
            pull(newCols, emptyFlex).push(emptyFlex);
        }

        this.columns = newCols;
    }

    getTreePath(col, arr) {
        // Ungrouped columns in a grid that contains grouped columns will have ancestors with numeric Ids
        const parentGroup = col.parent;

        if (parentGroup) {
            arr.unshift(parentGroup.groupId);
            return this.getTreePath(parentGroup, arr);
        } else {
            return arr;
        }
    }

    // findColumn(col, columns) {
    //
    //     columns.forEach(it => {
    //         if (it.colId = col.colId) return it;
    //         if
    //     })
    //
    // }

        // if not found check for column in a nested in a group

        // when you find that group, it means that that entire group is next
        // i.e. it may have been moved but only the entire group can move at a time

        // therefore you want to build the remaining cols that were designated in that group right now.
        // in the order that they are specified in the agColumn state (don't forgot to recurse)
        // this grouped column is next in the overall newCol list
        // the found columns should be removed from the agColumnsState or otherwise dealt with such that they don't end up in the grid twice

    // }

    //-----------------------
    // Implementation
    //-----------------------
    validateColumns(cols) {
        if (isEmpty(cols)) return;

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
