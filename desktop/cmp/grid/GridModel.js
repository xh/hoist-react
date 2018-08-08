/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {StoreSelectionModel} from '@xh/hoist/data';
import {StoreContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {defaults, castArray, find, isString, isPlainObject, orderBy, pull, last} from 'lodash';

import {Column} from '@xh/hoist/columns';
import {warnIf} from '@xh/hoist/utils/JsUtils';
import {ColChooserModel} from './ColChooserModel';
import {GridStateModel} from './GridStateModel';
import {ExportManager} from './ExportManager';

/**
 * Core Model for a Grid, specifying the grid's data store, column definitions,
 * sorting/grouping/selection state, and context menu configuration.
 */
@HoistModel()
export class GridModel {

    // Immutable public properties
    store = null;
    selModel = null;
    contextMenuFn = null;
    colChooserModel = null;
    stateModel = null;
    exportFilename = null;
    enableExport = null;

    @observable.ref agApi = null;
    @observable.ref columns = [];
    @observable.ref sortBy = [];
    @observable groupBy = null;

    static defaultContextMenuTokens = [
        'copy',
        'copyWithHeaders',
        '-',
        'exportExcel',
        'exportCsv',
        '-',
        'autoSizeAll',
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
     * @param {BaseStore} store - store containing the data for the grid.
     * @param {Object[]} columns - collection of Columns or configs to create them.
     * @param {string} [emptyText] - empty text to display if grid has no records. Can be valid HTML.
     *      Defaults to null, in which case no empty text will be shown.
     * @param {Object[]} [sortBy] - one or more sorters to apply to store data.
     * @param {string} [sortBy[].colId] - Column ID by which to sort.
     * @param {string} [sortBy[].sort] - sort direction [asc|desc].
     * @param {string} [groupBy] - Column ID by which to group.
     * @param {boolean} [enableColChooser] - true to setup support for column chooser UI and
     *      install a default context menu item to launch the chooser.
     * @param {boolean} [enableExport] - true to install default export context menu items.
     * @param {function|string} [exportFilename] - Filename for exported file, or a closure to generate one.
     * @param {(StoreSelectionModel|Object|String)} [selModel] - selection model to use,
     *      config to create one, or 'mode' property for a selection model.
     * @param {(GridStateModel|Object|String)} [stateModel] - state model to use,
     *      config to create one, or xhStateId property for a state model
     * @param {function} [contextMenuFn] - closure returning a StoreContextMenu().
     */
    constructor({
        store,
        columns,
        selModel,
        emptyText = null,
        sortBy = [],
        groupBy = null,
        enableColChooser = false,
        enableExport = false,
        exportFilename = 'export',
        stateModel = null,
        contextMenuFn = () => this.defaultContextMenu()
    }) {
        this.store = store;
        this.columns = columns.map(c => c instanceof Column ? c : new Column(c));
        this.emptyText = emptyText;
        this.enableExport = enableExport;
        this.exportFilename = exportFilename;
        this.contextMenuFn = contextMenuFn;

        this.validateAndAdjustColumns();

        if (enableColChooser) {
            this.colChooserModel = new ColChooserModel(this);
        }

        this.setGroupBy(groupBy);
        this.setSortBy(sortBy);

        this.selModel = this.initSelModel(selModel, store);
        this.stateModel = this.initStateModel(stateModel);
    }

    /**
     * Exports the grid using Hoist's server-side export.
     *
     * @param {Object} options
     * @param {(string|function)} options.filename - name for exported file or closure to generate.
     * @param {string} options.type - type of export - one of ['excel', 'excelTable', 'csv'].
     */
    export(options = {}) {
        const {type, filename = this.exportFilename} = options,
            exportManager = new ExportManager();

        exportManager.exportAsync(this, filename, type);
    }

    /**
     * Exports the grid using agGrid's client-side export
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

    /**
     * Select the first row in the grid.
     */
    selectFirst() {
        const {store, selModel, sortBy} = this,
            colIds = sortBy.map(it => it.colId),
            sorts = sortBy.map(it => it.sort),
            recs = orderBy(store.records, colIds, sorts);

        if (recs.length) selModel.select(recs[0]);
    }

    /**
     * Shortcut to the currently selected records (observable).
     *
     * @see StoreSelectionModel.records
     */
    get selection() {
        return this.selModel.records;
    }

    /**
     * Shortcut to a single selected record (observable).
     * This will be null if multiple records are selected.
     *
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
     * Set row grouping
     *
     * This method is no-op if provided a field without a corresponding column.
     * A falsey field argument will remove grouping entirely.
     */
    @action
    setGroupBy(field) {
        const cols = this.columns,
            groupCol = find(cols, {field});

        if (field && !groupCol) return;

        cols.forEach(it => {
            if (it.rowGroup) {
                it.rowGroup = false;
                it.hide = false;
            }
        });

        if (field && groupCol) {
            groupCol.rowGroup = true;
            groupCol.hide = true;
        }

        this.columns = [...cols];
    }

    /**
     * Set sort by column
     *
     * This method is no-op if provided any sorters without a corresponding column
     */
    @action
    setSortBy(sortBy) {
        // Normalize string, and partially specified values
        sortBy = castArray(sortBy);
        sortBy = sortBy.map(it => {
            if (isString(it)) it = {colId: it};
            it.sort = it.sort || 'asc';
            return it;
        });

        const sortIsValid = sortBy.every(it => find(this.columns, {colId: it.colId}));
        if (!sortIsValid) return;

        this.sortBy = sortBy;
    }


    /** Load the underlying store. */
    loadAsync(...args) {
        return this.store.loadAsync(...args);
    }

    /** Load the underlying store. */
    loadData(...args) {
        return this.store.loadData(...args);
    }

    // TODO - review options for a "true" clone here, and behavior of setColumns() below.
    cloneColumns() {
        return [...this.columns];
    }

    @action
    setColumns(cols) {
        this.columns = [...cols];
    }

    showColChooser() {
        if (this.colChooserModel) {
            this.colChooserModel.open();
        }
    }

    noteAgColumnStateChanged(agColumnState) {
        const {columns} = this;
        // Gether cols in correct order, and apply updated widths.
        let newCols = agColumnState.map(agCol => {
            const col = find(this.columns, {colId: agCol.colId});
            if (!col.flex) col.width = agCol.width;
            return col;
        });

        // Force any emptyFlexCol at end to stay at end!
        const emptyFlex = find(columns, {colId: 'emptyFlex'});
        if (emptyFlex && last(columns) == emptyFlex  && last(newCols) != emptyFlex) {
            pull(newCols, emptyFlex).push(emptyFlex);
        }

        this.setColumns(newCols);
    }


    //-----------------------
    // Implementation
    //-----------------------
    validateAndAdjustColumns() {
        const {columns} = this;
        columns.forEach(c => {

            warnIf(
                c.flex && c.width,
                `Column ${c.colId} should not be specified with both flex = true && width.  Width will be ignored.`,
            );

            // Prevent flex col from becoming hidden inadvertently.  Can be avoided by setting minWidth to null or 0.
            if (c.flex && this.minWidth === undefined && c.length >0) {
                this.minWidth = 10;
            }
        });

        const flexCols = columns.filter(c => c.flex);
        warnIf(
            !flexCols.length,
            `No columns have flex set (flex=true). This may yield empty space for large grids. Consider making the
             last column a flex column, or adding an 'emptyFlexCol' at the end of your columns array.`
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

        if (stateModel instanceof GridStateModel) {
            ret = stateModel;
        } else if (isPlainObject(stateModel)) {
            ret = new GridStateModel(stateModel);
        } else if (isString(stateModel)) {
            ret = new GridStateModel({xhStateId: stateModel});
        }
        if (ret) ret.init(this);

        return ret;
    }

    destroy() {
        XH.safeDestroy(this.colChooserModel);
        // TODO: How are Stores destroyed?
    }
}