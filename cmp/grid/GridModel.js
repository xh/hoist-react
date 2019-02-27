/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH, LoadSupport} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {StoreSelectionModel} from '@xh/hoist/data';
import {
    castArray,
    defaults,
    find,
    findLast,
    isEmpty,
    isPlainObject,
    isString,
    last,
    sortBy,
    pull,
    uniq,
    isNil,
    cloneDeep
} from 'lodash';
import {Column, ColumnGroup} from '@xh/hoist/cmp/grid';
import {withDefault, throwIf, warnIf} from '@xh/hoist/utils/js';
import {GridStateModel} from './GridStateModel';
import {GridSorter} from './impl/GridSorter';

import {ColChooserModel as DesktopColChooserModel, StoreContextMenu} from '@xh/hoist/dynamics/desktop';
import {ColChooserModel as MobileColChooserModel} from '@xh/hoist/dynamics/mobile';

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
@LoadSupport
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
    /** @member {object} */
    exportOptions = null;

    //------------------------
    // Observable API
    //------------------------
    /** @member {Object[]} - {@link Column} and {@link ColumnGroup} objects */
    @observable.ref columns = [];
    /** @member {ColumnState[]} */
    @observable.ref columnState = [];
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
        if (XH.isMobile) return null;
        return new StoreContextMenu({
            items: GridModel.defaultContextMenuTokens,
            gridModel: this
        });
    };

    /**
     * @param {Object} c - GridModel configuration.
     * @param {BaseStore} c.store - store containing the data for the grid.
     * @param {Object[]} c.columns - {@link Column} or {@link ColumnGroup} configs
     * @param {boolean} [c.treeMode] - true if grid is a tree grid (default false).
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
     * @param {boolean} [c.enableExport] - true to enable exporting this grid and
     *      install default context menu items.
     * @param {object} [c.exportOptions] - default options used in exportAsync().
     * @param {function} [c.rowClassFn] - closure to generate css class names for a row.
     *      Should return a string or array of strings. Receives record data as param.
     * @param {function} [c.contextMenuFn] - closure returning a StoreContextMenu (desktop only)
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
        exportOptions = {},
        rowClassFn = null,
        contextMenuFn = () => this.defaultContextMenu(),
        ...rest
    }) {
        this.store = store;
        this.treeMode = treeMode;
        this.emptyText = emptyText;
        this.contextMenuFn = contextMenuFn;
        this.rowClassFn = rowClassFn;

        this.enableExport = enableExport;
        this.exportOptions = exportOptions;

        Object.assign(this, rest);

        this.setColumns(columns);

        this.setGroupBy(groupBy);
        this.setSortBy(sortBy);
        this.setCompact(compact);

        this.colChooserModel = enableColChooser ? this.createChooserModel() : null;
        this.selModel = this.parseSelModel(selModel);
        this.stateModel = this.parseStateModel(stateModel);
    }

    /**
     * Export grid data using Hoist's server-side export.
     *
     * @param {Object} options - Export options. See GridExportService.exportAsync() for options.
     */
    async exportAsync(options = {}) {
        throwIf(!this.enableExport, 'Export not enabled for this grid. See GridModel.enableExport');
        return XH.gridExportService.exportAsync(this, {...this.exportOptions, ...options});
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
            const idx = (this.groupBy && !this.treeMode) ? 1 : 0,
                first = agApi.getDisplayedRowAtIndex(idx);

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
     * This method is no-op if provided any ids without a corresponding column.
     * @param {(string|string[])} colIds - column ID(s) for row grouping, or falsey value to ungroup.
     */
    @action
    setGroupBy(colIds) {
        if (!colIds) {
            this.groupBy = [];
            return;
        }

        colIds = castArray(colIds);

        const invalidColIds = colIds.filter(it => !this.findColumn(this.columns, it));
        if (invalidColIds.length) {
            console.warn('groupBy colId not found in grid columns', invalidColIds);
            return;
        }

        this.groupBy = colIds;
    }

    /** Expand all parent rows in grouped or tree grid. (Note, this is recursive for trees!) */
    expandAll() {
        const {agApi} = this;
        if (agApi) {
            agApi.expandAll();
            agApi.sizeColumnsToFit();
        }
    }

    /** Collapse all parent rows in grouped or tree grid. */
    collapseAll() {
        const {agApi} = this;
        if (agApi) {
            agApi.collapseAll();
            agApi.sizeColumnsToFit();
        }
    }

    /**
     * This method is no-op if provided any sorters without a corresponding column.
     * @param {(string|string[]|Object|Object[])} sorters - colId(s), GridSorter config(s)
     *      GridSorter strings, or a falsey value to clear the sort config.
     */
    @action
    setSortBy(sorters) {
        if (!sorters) {
            this.sortBy = [];
            return;
        }

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

    /** Load the underlying store. */
    async doLoadAsync(loadSpec) {
        throwIf(!this.store.isLoadSupport, 'Underlying store does not define support for loading.');
        return this.store.loadAsync(loadSpec);
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
        this.columnState = this.getLeafColumns()
            .map(({colId, width, hidden}) => ({colId, width, hidden}));
    }

    showColChooser() {
        if (this.colChooserModel) {
            this.colChooserModel.open();
        }
    }

    noteAgColumnStateChanged(agColState) {
        const colStateChanges = agColState.map(({colId, width, hide}) => {
            const col = this.findColumn(this.columns, colId);
            if (!col) return null;
            return {
                colId,
                hidden: hide,
                width: col.flex ? undefined : width
            };
        });

        pull(colStateChanges, null);
        this.applyColumnStateChanges(colStateChanges);
    }

    /**
     * This method will update the current column definition. Throws an exception if any of the
     * columns provided in colStateChanges are not present in the current column list.
     *
     * Note: Column ordering is determined by the individual (leaf-level) columns in state.
     * This means that if a column has been redefined to a new column group, that entire group may
     * be moved to a new index.
     *
     * @param {ColumnState[]} colStateChanges - changes to apply to the columns. If all leaf columns are
     *      represented in these changes then the sort order will be applied as well.
     */
    @action
    applyColumnStateChanges(colStateChanges) {
        let columnState = cloneDeep(this.columnState);

        throwIf(colStateChanges.some(({colId}) => !this.findColumn(columnState, colId)),
            'Invalid columns detected in column changes!');

        // 1) Update any width or visibility changes
        colStateChanges.forEach(change => {
            const col = this.findColumn(columnState, change.colId);

            if (!isNil(change.width)) col.width = change.width;
            if (!isNil(change.hidden)) col.hidden = change.hidden;
        });

        // 2) If the changes provided is a full list of leaf columns, synchronize the sort order
        const leafCols = this.getLeafColumns();
        if (colStateChanges.length === leafCols.length) {
            // 2.a) Mark (potentially changed) sort order
            colStateChanges.forEach((change, index) => {
                const col = this.findColumn(columnState, change.colId);
                col._sortOrder = index;
            });

            // 2.b) Install implied group sort orders and sort
            columnState.forEach(it => this.markGroupSortOrder(it));
            columnState = this.sortColumns(columnState);

            // 2.c) Force any emptyFlexCol that is last to stay last (avoid user dragging)!
            const emptyFlex = findLast(columnState, {colId: 'emptyFlex'});
            if (emptyFlex && last(this.columns).colId === 'emptyFlex' && last(columnState) !== emptyFlex) {
                pull(columnState, emptyFlex).push(emptyFlex);
            }
        }

        this.columnState = columnState;
    }

    /**
     * Return all leaf-level columns - i.e. excluding column groups.
     * @returns {Column[]}
     */
    getLeafColumns() {
        return this.gatherLeaves(this.columns);
    }

    /**
     * Determine whether or not a given leaf-level column is currently visible.
     *
     * Call this method instead of inspecting the `hidden` property on the Column itself, as that
     * property is not updated with state changes.
     *
     * @param {String} colId
     * @returns {boolean}
     */
    isColumnVisible(colId) {
        const state = this.getStateForColumn(colId);
        return state ? !state.hidden : false;
    }

    /**
     * Return matching leaf-level Column or ColumnState object from the provided collection for the
     * given colId, if any. Used as a utility function to find both types of objects.
     */
    findColumn(cols, colId) {
        for (let col of cols) {
            if (col.children) {
                const ret = this.findColumn(col.children, colId);
                if (ret) return ret;
            } else {
                if (col.colId == colId) return col;
            }
        }
        return null;
    }

    /**
     * Return the current state object representation for the given colId.
     *
     * Note that column state updates do not write changes back to the original Column object (as
     * held in this model's `columns` collection), so this method should be called whenever the
     * current value of any state-tracked property is required.
     *
     * @param {string} colId
     * @returns {ColumnState}
     */
    getStateForColumn(colId) {
        return find(this.columnState, {colId});
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

    parseSelModel(selModel) {
        selModel = withDefault(selModel, XH.isMobile ? 'disabled' : 'single');

        if (selModel instanceof StoreSelectionModel) {
            return selModel;
        }

        if (isPlainObject(selModel)) {
            return this.markManaged(new StoreSelectionModel(defaults(selModel, {store: this.store})));
        }
        // Assume its just the mode...
        let mode = 'single';
        if (isString(selModel)) {
            mode = selModel;
        } else if (selModel === null) {
            mode = 'disabled';
        }
        return this.markManaged(new StoreSelectionModel({mode, store: this.store}));
    }

    parseStateModel(stateModel) {
        let ret = null;
        if (isPlainObject(stateModel)) {
            ret = new GridStateModel(stateModel);
        } else if (isString(stateModel)) {
            ret = new GridStateModel({gridId: stateModel});
        }
        if (ret) {
            ret.init(this);
            this.markManaged(ret);
        }
        return ret;
    }

    createChooserModel() {
        const Model = XH.isMobile ? MobileColChooserModel : DesktopColChooserModel;
        return this.markManaged(new Model(this));
    }
}

/**
 * @typedef {Object} ColumnState
 * @property {string} colId - unique identifier of the column
 * @property {number} [width] - new width to set for the column
 * @property {boolean} [hidden] - visibility of the column
 */
