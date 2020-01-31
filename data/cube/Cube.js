/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */


import {managed} from '@xh/hoist/core';
import {Query, View, CubeField} from './';
import {Store} from '../';

import {isEmpty} from 'lodash';
/**
 * A container for grouping, aggregating, and filtering data on multiple dimensions.
 *
 * This object is a wrapper around a Store, which allows the creation of observable
 * "views" -- filtered and aggregated views on this data.
 */
export class Cube {

    static RECORD_ID_DELIMITER = '>>';

    @managed
    _store = null
    _info = null;
    _lockFn = null;

    _connectedViews = new Set();

    /**
     * @param {Object} c - Cube configuration.
     * @param {(CubeField[]|Object[])} - array of CubeFields / {@see CubeField} configs.
     *      See Store.fields.
     * @param {(function|string)} [c.idSpec] - see Store.idSpec
     * @param {function} [c.processRawData] - see Store.processRawData/
     * @param {Object[]} [c.data] - array of initial raw data.
     * @param {Object} [c.info] - map of metadata associated with this data.
     * @param {function} [c.lockFn] - function to be called for each node to determine if it should
     *      be "locked", preventing drilldown into its children. If true returned for a node, no
     *      drilldown will be allowed, and the row will be marked with a boolean "locked" property.
     */
    constructor({fields, idSpec, processRawData, rawData, info, lockFn}) {
        this._store = new Store({
            fields: this.parseFields(fields),
            idSpec,
            processRawData
        });
        this._store.loadData(rawData, info);
        this._lockFn = lockFn;
    }

    /** @returns {Object} - optional metadata associated with this Cube at the last data load. */
    get info() {
        return this._info;
    }

    /**
     * Populate this cube with a new dataset.
     *
     * This method largely delegates to Store.loadData().  See that method for more
     * information.
     *
     * @param {Object[]} rawData - flat array of lowest/leaf level data rows.
     * @param {Object} info - optional metadata to associate with this cube/dataset.
     */
    loadData(rawData, info = {}) {
        this._store.loadData(rawData);
        this._info = Object.freeze(info);
        this._connectedViews.forEach(view => view.noteCubeLoaded());
    }

    /**
     * Query the cube.
     *
     * This method will return an immutable snapshot of javascript objects representing the filtered
     * and aggregated data in the query.  To receive an auto-updating form of the data use
     * createView instead.
     *
     * @param {Query} query - Query (or config for one) defining the shape of the view.
     * @returns {Object} -- hierarchical data containing the results of the query.
     */
    executeQuery(query) {
        query = query instanceof Query ? query : new Query(query);
        query.cube = this;
        const view = new View(query, false),
            ret = view.getData();

        view.destroy();
        return ret;
    }

    /**
     * Create a View on this data.
     *
     * @param {Query} query - Query (or config for one) defining the shape of the view.
     * @param {boolean} connect - true to update the returned view as the data in this cube
     *      changes (versus a snapshot)
     * @returns {View}
     */
    createView(query, store, connect) {
        query = query instanceof Query ? query : new Query(query);
        query.cube = this;
        const view = new View(query, store);
        if (connect) this._connectedViews.add(view);
        return view;
    }

    /**
     * Update this cube with incremental data set changes and/or info.
     *
     * This method largely delegates to Store.updateData().  See that method for more
     * information.
     *
     * @param {(Object[]|StoreTransaction)} rawData
     * @param {Object} info
     */
    updateData(rawData, info) {
        // 1) Process data
        const transaction = this._store.updateData(rawData);

        // 2) Process info
        const infoUpdated = isEmpty(info);
        if (!isEmpty(info)) {
            this._info = {...this._info, info};
        }

        // 3) Notify connected views
        if (transaction || infoUpdated) {
            this._connectedViews.forEach(view => {
                view.noteCubeUpdated(transaction, infoUpdated);
            });
        }
    }

    disconnectView(v) {
        this._connectedViews.delete(v);

    }

    //---------------------
    // Implementation
    //---------------------
    parseFields(fields = []) {
        return fields.map(f => f instanceof CubeField ? f : new CubeField(f));
    }

    destroy() {
        this._connectedViews.forEach(v => this.disconnectView(v));
    }
}