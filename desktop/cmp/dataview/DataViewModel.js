/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {HoistModel, managed} from '@xh/hoist/core';
import {GridModel} from '@xh/hoist/cmp/grid';
import {GridSorter} from '@xh/hoist/cmp/grid/impl/GridSorter';
import {throwIf} from '@xh/hoist/utils/js';
import {castArray} from 'lodash';

/**
 * DataViewModel is a wrapper around GridModel, which shows sorted data in a single column,
 * using a configured component for rendering each item.
 *
 * This is the primary app entry-point for specifying DataView component options and behavior.
 */
@HoistModel
export class DataViewModel {

    @managed
    gridModel;

    /**
     * @param {Object} c - DataViewModel configuration.
     * @param {Column~elementRendererFn} c.itemRenderer - function which returns a React component.
     * @param {(Store|Object)} c.store - a Store instance, or a config with which to create a
     *      default Store. The store is the source for the view's data.
     * @param {(string|string[]|Object|Object[])} [c.sortBy] - colId(s) or sorter config(s) with
     *      `colId` and `sort` (asc|desc) keys.
     * @param {(StoreSelectionModel|Object|String)} [c.selModel] - StoreSelectionModel, or a
     *      config or string `mode` from which to create.
     * @param {string} [c.emptyText] - text/HTML to display if view has no records.
     * @param {function} [c.contextMenuFn] - closure returning a StoreContextMenu().
     */
    constructor({
        itemRenderer,
        store,
        sortBy = [],
        selModel,
        emptyText,
        contextMenuFn = null
    }) {
        sortBy = castArray(sortBy);
        throwIf(sortBy.length > 1, 'DataViewModel does not support multiple sorters.');

        // We only have a single column in our DataView grid, and we also rely on ag-Grid to keep
        // the data sorted, initially and through updates via transactions. To continue leveraging
        // the grid for sort, set the field of our single column to the desired sort field. (The
        // field setting should not have any other meaningful impact on the grid, since we use a
        // custom renderer and mark it as complex to ensure re-renders on any record change.)
        let field = 'id';
        if (sortBy.length === 1) {
            let sorter = sortBy[0];
            if (!(sorter instanceof GridSorter)) sorter = GridSorter.parse(sorter);
            field = sorter.colId;
        }

        this.gridModel = new GridModel({
            store,
            sortBy,
            selModel,
            contextMenuFn,
            emptyText,
            columns: [
                {
                    field,
                    flex: true,
                    elementRenderer: itemRenderer,
                    rendererIsComplex: true
                }
            ]
        });

    }

    get store() {return this.gridModel.store}
    get selModel() {return this.gridModel.selModel}

    /** Select the first record in the DataView. */
    selectFirst() {
        this.gridModel.selectFirst();
    }

    /**
     * Shortcut to the currently selected records (observable).
     * @see StoreSelectionModel.records
     */
    get selection() {
        return this.selModel.records;
    }

    /**
     * Shortcut to a single selected record (observable), or null if multiple records selected.
     * @see StoreSelectionModel.singleRecord
     */
    get selectedRecord() {
        return this.selModel.singleRecord;
    }

    /** Load the underlying store. */
    doLoadAsync(loadSpec) {
        throwIf(!this.store.isLoadSupport, 'Underlying store does not define support for loading.');
        return this.store.loadAsync(loadSpec);
    }

    /** Load the underlying store. */
    loadData(...args) {
        return this.store.loadData(...args);
    }

    /** Update the underlying store. */
    updateData(...args) {
        return this.store.updateData(...args);
    }

    /** Clear the underlying store, removing all rows. */
    clear() {
        this.store.clear();
    }

}
