/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable} from '@xh/hoist/mobx';

/**
 * Core Model for a Grid, specifying the grid's data store and column definitions
 */
@HoistModel
export class GridModel {

    // Immutable public properties
    store = null;
    handler = null;
    @observable leftColumn = null;
    @observable rightColumn = null;
    @observable hideHeader = null;

    /**
     * @param {Object} c - GridModel configuration.
     * @param {BaseStore} c.store - store containing the data for the grid.
     * @param {Object} c.leftColumn - column specification to show in left side of grid.
     * @param {Object} c.rightColumn - column specification to show in right side of grid.
     * @param {function} [c.handler] - function to trigger on item tap. Receives record as argument.
     * @param {boolean} [c.hideHeader] - true to hide the header row.
     */
    constructor({
        store,
        leftColumn,
        rightColumn,
        handler,
        hideHeader = false
    }) {
        this.store = store;
        this.leftColumn = leftColumn;
        this.rightColumn = rightColumn;
        this.handler = handler;
        this.hideHeader = hideHeader;
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