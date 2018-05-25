/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {StoreSelectionModel} from '@xh/hoist/data';
import {StoreContextMenu} from '@xh/hoist/cmp/contextmenu';
import {Icon} from '@xh/hoist/icon';
import {defaults, castArray, findIndex, isString, isPlainObject, orderBy} from 'lodash';

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

    @observable.ref agApi = null;
    @observable.ref columns = [];
    @observable.ref sortBy = [];
    @observable groupBy = null;


    defaultContextMenu = () => {
        return new StoreContextMenu([
            'copy',
            'copyWithHeaders',
            '-',
            'export',
            'autoSizeAll',
            '-',
            {
                text: 'Columns...',
                icon: Icon.grid(),
                hidden: !this.colChooserModel,
                action: () => {
                    this.colChooserModel.open();
                }
            }
        ]);
    };

    /**
     * @param {BaseStore} store - store containing the data for the grid.
     * @param {Object[]} columns - collection of column specifications.
     * @param {(StoreSelectionModel|Object|String)} [selModel] - selection model to use,
     *      config to create one, or 'mode' property for a selection model.
     * @param {string} [emptyText] - empty text to display if grid has no records. Can be valid HTML.
     *      Defaults to null, in which case no empty text will be shown.
     * @param {Object[]} [sortBy] - one or more sorters to apply to store data.
     * @param {string} [sortBy[].colId] - Column ID by which to sort.
     * @param {string} [sortBy[].sort] - sort direction [asc|desc].
     * @param {string} [groupBy] - Column ID by which to group.
     * @param {boolean} [enableColChooser] - true to setup support for column chooser UI and
     *      install a default context menu item to launch the chooser.
     * @param {GridStateModel} stateModel - TODO: DOC THIS
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
        stateModel = null,
        contextMenuFn = () => this.defaultContextMenu()
    }) {
        this.store = store;
        this.columns = columns;
        this.contextMenuFn = contextMenuFn;

        this.selModel = this.parseSelModel(selModel, store);
        this.emptyText = emptyText;

        if (enableColChooser) {
            this.colChooserModel = new ColChooserModel(this);
        }

        this.setGroupBy(groupBy);
        this.setSortBy(sortBy);

        if (stateModel) {
            this.initGridState(stateModel);
        }
    }

    exportDataAsExcel(params) {
        if (!this.agApi) return;
        params.processCellCallback = this.formatValuesForExport;
        this.agApi.exportDataAsExcel(params);
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

    @action
    setGroupBy(field) {
        const cols = this.columns;

        cols.forEach(it => {
            if (it.rowGroup) {
                it.rowGroup = false;
                it.hide = false;
            }
        });

        if (field) {
            const col = find(cols, {field});
            if (col) {
                col.rowGroup = true;
                col.hide = true;
            }
        }
        
        this.columns = [...cols];
    }

    @action
    setSortBy(sortBy) {
        // Normalize string, and partially specified values
        sortBy = castArray(sortBy);
        sortBy = sortBy.map(it => {
            if (isString(it)) it = {colId: it};
            it.sort = it.sort || 'asc';
            return it;
        });

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

    syncColumnOrder(columns) {
        const orderedCols = [];

        let orderChanged = false;
        columns.forEach((gridCol, idx) => {
            const colId = gridCol.colId,
                colIdx = findIndex(this.columns, {colId});

            if (idx !== colIdx) orderChanged = true;
            orderedCols.push(columns[colIdx]);
        });

        if (orderChanged) this.setColumns(orderedCols);
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


    parseSelModel(selModel, store) {
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
        } else  if (selModel === null) {
            mode = 'disabled';
        }

        return new StoreSelectionModel({mode, store});
    }

    destroy() {
        XH.safeDestroy(this.colChooserModel);
        // TODO: How are Stores destroyed?
    }

    initGridState(stateModel) {
        this.stateModel = stateModel instanceof GridStateModel ? stateModel : new GridStateModel(stateModel);
        this.stateModel.init(this);
    }

}