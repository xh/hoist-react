/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from 'hoist/core';
import {StoreSelectionModel} from 'hoist/data';
import {StoreContextMenu} from 'hoist/cmp/panel';

/**
 * DataViewModel is a wrapper around GridModel, which shows sorted data in
 * a single column, using a defined component for rendering each item.
 */
@HoistModel()
export class DataViewModel {

    // Immutable public properties
    itemFactory = null;
    store = null;
    selection = null;
    contextMenuFn = null;

    static defaultContextMenu = () => {
        return new StoreContextMenu([
            'copy',
            '-',
            'export'
        ]);
    };

    /**
     * @param {function} itemFactory - elemFactory for the component used to render each item.
     *      Will receive record via its props.
     * @param {BaseStore} store - store containing the data for the dataview.
     * @param {StoreSelectionModel} [selection] - selection model to use
     * @param {function} [contextMenuFn] - closure returning a StoreContextMenu().
     */
    constructor({
        itemFactory,
        store,
        selection,
        contextMenuFn = DataViewModel.defaultContextMenu
    }) {
        this.itemFactory = itemFactory;
        this.store = store;
        this.selection = selection || new StoreSelectionModel({store: this.store});
        this.contextMenuFn = contextMenuFn;
    }

    /**
     * Select the first row in the dataview.
     * Note that dataview assumes store data is already sorted
     */
    selectFirst() {
        const {store, selection} = this,
            recs = store.records;

        if (recs.length) selection.select(recs[0]);
    }

    /** Load the underlying store. */
    loadAsync(...args) {
        return this.store.loadAsync(...args);
    }

    /** Load the underlying store. */
    loadData(...args) {
        return this.store.loadData(...args);
    }

}