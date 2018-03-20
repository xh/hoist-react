/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable} from 'hoist/mobx';
import {LastPromiseModel} from 'hoist/promise';

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

    static defaultContextMenu = () => {
        return new GridContextMenu([
            'copy',
            'copyWithHeaders',
            '-',
            'export',
            'autoSizeAll'
        ]);
    }


    /**
     * Construct this object.
     *
     * @param store, store containing the data for the grid.
     * @param columns, collection of column specifications.
     * @param contextMenuFn, closure returning a GridContextMenu().
     */
    constructor({
        store,
        columns,
        contextMenuFn = GridModel.defaultContextMenu
    }) {
        this.store = store;
        this.columns = columns;
        this.contextMenuFn = contextMenuFn;
        this.selection = new GridSelectionModel({parent: this});
    }

    exportDataAsExcel(params) {
        if (!this.gridApi) return;
        params.processCellCallback = this.formatValuesForExport;
        this.gridApi.exportDataAsExcel(params);
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
}