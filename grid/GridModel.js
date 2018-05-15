/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from 'hoist/core';
import {action, observable} from 'hoist/mobx';
import {StoreSelectionModel} from 'hoist/data';
import {StoreContextMenu} from 'hoist/cmp';
import {castArray, find, isString, orderBy} from 'lodash';

/**
 * Core Model for a Grid, specifying the grid's data store, column definitions,
 * sorting/grouping/selection state, and context menu configuration.
 */
@HoistModel()
export class GridModel {

    // Immutable public properties
    store = null;
    selection = null;
    contextMenuFn = null;

    @observable.ref gridApi = null;
    @observable.ref columns = [];
    @observable.ref sortBy = [];
    @observable groupBy = null;

    static defaultContextMenu = () => {
        return new StoreContextMenu([
            'copy',
            'copyWithHeaders',
            '-',
            'export',
            'autoSizeAll'
        ]);
    }

    /**
     * @param {BaseStore} store - store containing the data for the grid.
     * @param {Object[]} columns - collection of column specifications.
     * @param {StoreSelectionModel} [selection] - selection model to use
     * @param {boolean} [emptyText] - empty text to display if grid has no records. Can be valid HTML.
     *      Defaults to null, in which case no empty text will be shown.
     * @param {Object[]} [sortBy] - one or more sorters to apply to store data.
     * @param {string} [sortBy[].colId] - Column ID by which to sort.
     * @param {string} [sortBy[].sort] - sort direction [asc|desc].
     * @param {string} [groupBy] - Column ID by which to group.
     * @param {function} [contextMenuFn] - closure returning a StoreContextMenu().
     */
    constructor({
        store,
        columns,
        selection,
        emptyText = null,
        sortBy = [],
        groupBy = null,
        contextMenuFn = GridModel.defaultContextMenu
    }) {
        this.store = store;
        this.columns = columns;
        this.contextMenuFn = contextMenuFn;
        this.selection = selection || new StoreSelectionModel({store: this.store});
        this.emptyText = emptyText;
        this.setGroupBy(groupBy);
        this.setSortBy(sortBy);
    }

    exportDataAsExcel(params) {
        if (!this.gridApi) return;
        params.processCellCallback = this.formatValuesForExport;
        this.gridApi.exportDataAsExcel(params);
    }

    /**
     * Select the first row in the grid.
     */
    selectFirst() {
        const {store, selection, sortBy} = this,
            colIds = sortBy.map(it => it.colId),
            sorts = sortBy.map(it => it.sort),
            recs = orderBy(store.records, colIds, sorts);

        if (recs.length) selection.select(recs[0]);
    }

    @action
    setGridApi(gridApi) {
        this.gridApi = gridApi;
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

    destroy() {
        // TODO: How are Stores destroyed?
    }
}