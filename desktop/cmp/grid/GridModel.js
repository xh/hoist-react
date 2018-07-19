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
import {ExportManager} from '@xh/hoist/export';
import {defaults, castArray, find, isEqual, isString, isPlainObject, orderBy} from 'lodash';

import {ColChooserModel} from './ColChooserModel';
import {GridStateModel} from './GridStateModel';

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
    exportLocal = null;
    exportType = null;
    exportFilename = null;
    enableExport = null;

    @observable.ref agApi = null;
    @observable.ref columns = [];
    @observable.ref sortBy = [];
    @observable groupBy = null;


    defaultContextMenu = () => {
        return new StoreContextMenu({
            items: [
                'copy',
                'copyWithHeaders',
                '-',
                'exportExcel',
                'exportCsv',
                '-',
                'autoSizeAll',
                '-',
                'colChooser'
            ],
            gridModel: this
        });
    };

    /**
     * @param {BaseStore} store - store containing the data for the grid.
     * @param {Object[]} columns - collection of column specifications.
     * @param {string} [emptyText] - empty text to display if grid has no records. Can be valid HTML.
     *      Defaults to null, in which case no empty text will be shown.
     * @param {Object[]} [sortBy] - one or more sorters to apply to store data.
     * @param {string} [sortBy[].colId] - Column ID by which to sort.
     * @param {string} [sortBy[].sort] - sort direction [asc|desc].
     * @param {string} [groupBy] - Column ID by which to group.
     * @param {boolean} [exportLocal] - true to use agGrid's export. false to use Hoist provided server-side export.
     * @param {function|string} [exportFilename] - Filename for exported file, or a closure to generate one.
     * @param {string} [exportType] - Filetype for export file. One of ['excel', 'excelTable', 'csv', 'localExcel', 'localCsv']
     * @param {boolean} [enableExport] - false to disable export context menu items.
     * @param {boolean} [enableColChooser] - true to setup support for column chooser UI and
     *      install a default context menu item to launch the chooser.
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
        exportLocal = false,
        exportType = exportLocal ? 'localExcel' : 'excelTable',
        exportFilename = 'export',
        enableExport = true,
        enableColChooser = false,
        stateModel = null,
        contextMenuFn = () => this.defaultContextMenu()
    }) {
        this.store = store;
        this.columns = columns;
        this.emptyText = emptyText;
        this.exportLocal = exportLocal;
        this.exportType = exportType;
        this.exportFilename = exportFilename;
        this.enableExport = enableExport;
        this.contextMenuFn = contextMenuFn;

        if (enableColChooser) {
            this.colChooserModel = new ColChooserModel(this);
        }

        this.setGroupBy(groupBy);
        this.setSortBy(sortBy);

        this.selModel = this.initSelModel(selModel, store);
        this.stateModel = this.initStateModel(stateModel);
    }

    /**
     * Exports the grid to a file
     */
    export(options = {}) {
        const filename = options.filename || this.exportFilename,
            type = options.type || this.exportType;

        if (type.startsWith('local')) {
            this.localExport(filename, type);
        } else {
            ExportManager.export(this, filename, type);
        }
    }

    /**
     * Exports the grid using agGrid's client-side export
     */
    localExport(fileName, type, params = {}) {
        if (!this.agApi) return;
        defaults(params, {fileName, processCellCallback: this.formatValuesForExport});

        if (type === 'localExcel') {
            this.agApi.exportDataAsExcel(params);
        } else if (type === 'localCsv') {
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

    syncColumnOrder(agColumns) {
        // Check for no-op
        const xhColumns = this.columns,
            newIdOrder = agColumns.map(it => it.colId),
            oldIdOrder = xhColumns.map(it => it.colId),
            orderChanged = !isEqual(newIdOrder, oldIdOrder);

        if (!orderChanged) return;

        const orderedCols = [];
        agColumns.forEach(gridCol => {
            const col = find(xhColumns, {colId: gridCol.colId});
            orderedCols.push(col);
        });

        this.setColumns(orderedCols);
    }

    //-----------------------
    // Implementation
    //-----------------------
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
        if (!stateModel) return;
        let ret;

        if (stateModel instanceof GridStateModel) {
            ret = stateModel;
        }

        if (isPlainObject(stateModel)) {
            ret = new GridStateModel(stateModel);
        }

        if (isString(stateModel)) {
            ret = new GridStateModel({xhStateId: stateModel});
        }

        ret.init(this);
        return ret;
    }

    destroy() {
        XH.safeDestroy(this.colChooserModel);
        // TODO: How are Stores destroyed?
    }
}