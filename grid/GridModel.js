/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, action} from 'hoist/mobx';
import {LastPromiseModel} from 'hoist/promise';

import {find} from 'lodash';
import {GridSelectionModel} from './GridSelectionModel';
import {GridContextMenu} from './GridContextMenu';

/**
 * Core Model for a Grid.
 */
export class GridModel {

    // Immutable public properties
    store = null;
    gridApi = null;
    selection = null;
    loadModel = new LastPromiseModel();
    contextMenuFn = null

    @observable.ref columns = [];
    @observable.ref sorters = [];
    @observable groupBy

    static defaultContextMenu = () => {
        return new GridContextMenu([
            'copy',
            'copyWithHeaders',
            '-',
            'export'
        ]);
    }


    /**
     * Construct this object.
     *
     * @param store, store containing the data for the grid.
     * @param columns, collection of column specifications.
     * @param sorters, collection of form [{field: 'name', dir: 'ASC|DESC'}]
     * @param contextMenuFn, closure returning a GridContextMenu().
     */
    constructor({
        store,
        columns,
        sorters = [],
        groupBy = null,
        contextMenuFn = GridModel.defaultContextMenu
    }) {
        this.store = store;
        this.columns = columns;
        this.contextMenuFn = contextMenuFn;
        this.selection = new GridSelectionModel({parent: this});
        this.setGroupBy(groupBy);
        this.setSorters(sorters);
    }

    exportDataAsExcel(params) {
        if (!this.gridApi) return;
        params.processCellCallback = this.formatValuesForExport;
        this.gridApi.exportDataAsExcel(params);
    }

    @action
    setGroupBy(field) {
        const cols = this.columns;
        cols.forEach(it => {
            it.rowGroup = false;
            it.hide = false;
        });

        if (field) {
            const col = find(cols, {field});
            if (col) {
                col.rowGroup = true;
                col.hide = false;
            }
        }
        
        this.columns = [...cols];
    }

    @action
    setSorters(sorters) {
        this.sorters = sorters;
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
}