/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {StoreSelectionModel} from 'hoist/data';
import {GridContextMenu} from 'hoist/grid/GridContextMenu';

/**
 * DataViewModel is a wrapper around GridModel, which shows sorted data in
 * a single column, using a defined component for rendering each item.
 */
export class DataViewModel {

    // Immutable public properties
    itemFactory = null;
    store = null;
    selection = null;
    contextMenuFn = null;

    static defaultContextMenu = () => {
        return new GridContextMenu([
            'copy',
            '-',
            'export'
        ]);
    }

    /**
     * @param {function} itemFactory - elemFactory for the component used to render each item.
     *                                  Will receive record via its props.
     * @param {BaseStore} store - store containing the data for the dataview.
     * @param {StoreSelectionModel} selection - optional selection model to use
     * @param {function} contextMenuFn - closure returning a GridContextMenu().
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

}