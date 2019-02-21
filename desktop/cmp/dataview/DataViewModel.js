/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isPlainObject, defaults, isString, omit} from 'lodash';
import {HoistModel, managed} from '@xh/hoist/core';
import {StoreSelectionModel} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/cmp/grid';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * DataViewModel is a wrapper around GridModel, which shows sorted data in a single column,
 * using a configured component for rendering each item.
 *
 * This is the primary application entry-point for specifying DataView component options and behavior.
 */
@HoistModel
export class DataViewModel {

    // Immutable public properties
    itemRenderer = null;
    store = null;
    selModel = null;
    contextMenuFn = null;

    @managed
    gridModel;

    /**
     * @param {Object} c - DataViewModel configuration.
     * @param {Column~elementRendererFn} c.itemRenderer - function which returns a React component.
     * @param {BaseStore} c.store - store containing the data to be displayed.
     * @param {(StoreSelectionModel|Object|String)} [c.selModel] - StoreSelectionModel, or a
     *      config or string `mode` from which to create.
     * @param {string} [c.emptyText] - text/HTML to display if view has no records.
     * @param {function} [c.contextMenuFn] - closure returning a StoreContextMenu().
     */
    constructor({
        itemRenderer,
        store,
        selModel,
        emptyText,
        contextMenuFn = null
    }) {

        selModel = this.parseSelModel(selModel, store);

        this.itemRenderer = itemRenderer;
        this.store = store;
        this.selModel = selModel;
        this.emptyText = emptyText;
        this.contextMenuFn = contextMenuFn;

        this.gridModel = new GridModel({
            store,
            selModel,
            contextMenuFn,
            emptyText,
            columns: [
                {
                    colId: 'data',
                    flex: true,
                    elementRenderer: itemRenderer,
                    agOptions: {
                        valueGetter: this.valueGetter
                    }
                }
            ]
        });

    }

    /**
     * Select the first row in the dataview.
     * Note that dataview assumes store data is already sorted
     */
    selectFirst() {
        const {store, selModel} = this,
            recs = store.records;

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

    /** Load the underlying store. */
    doLoadAsync(loadSpec) {
        throwIf(!this.store.isLoadSupport, 'Underlying store does not define support for loading.');
        return this.store.loadAsync(loadSpec);
    }

    /** Load the underlying store. */
    loadData(...args) {
        return this.store.loadData(...args);
    }


    //------------------------
    // Implementation
    //------------------------
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


    valueGetter = (params) => {
        const realData = omit(params.data.raw, 'id');
        return Object.values(realData).join('\r');
    };
}
