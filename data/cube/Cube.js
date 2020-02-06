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
 * A data store that supports grouping, aggregating, and filtering data on multiple dimensions.
 *
 * This object is a wrapper around a Store.   It allows executing queries against that store
 * that performing filtering, grouping, and aggregating.  It also support the creation of
 * observable "views" for showing realtime updates to this data..
 */
export class Cube {

    static RECORD_ID_DELIMITER = '>>';

    @managed
    store = null;
    lockFn = null;

    _info = null;
    _connectedViews = new Set();

    /**
     * @param {Object} c - Cube configuration.
     * @param {(CubeField[]|Object[])} - array of CubeFields / {@see CubeField} configs.
     *      See Store.fields.
     * @param {Object[]} [c.data] - array of initial raw data.
     * @param {(function|string)} [c.idSpec] - see Store.idSpec.  Default 'id'
     * @param {function} [c.processRawData] - see Store.processRawData.
     * @param {Object} [c.info] - map of metadata associated with this data.
     * @param {LockFn} [c.lockFn] - optional function to be called for each node to aggregate to
     *      determine if it should be "locked", preventing drilldown into its children.
     */
    constructor({
        fields,
        idSpec = 'id',
        processRawData,
        data = [],
        info = {},
        lockFn
    }) {
        this.store = new Store({
            fields: this.parseFields(fields),
            idSpec,
            processRawData
        });
        this.store.loadData(data);
        this.lockFn = lockFn;
        this._info = info;
    }

    /** @returns {Object} - optional metadata associated with this Cube at the last data load. */
    get info() {
        return this._info;
    }

    //------------------
    // Querying API
    //-----------------

    /**
     * Query the cube.
     *
     * This method will return a snapshot of javascript objects representing the filtered
     * and aggregated data in the query.  In addition to the fields specified in Query, nodes will
     * each contain a 'cubeLabel' and a 'cubeDimension' property.
     *
     * @param {Object} query - Config for query defining the shape of the view.
     * @returns {Object[]} - data containing the results of the query as a hierarchical set of rows.
     */
    executeQuery(query) {
        query = new Query({...query, cube: this});
        const view = new View({query}),
            rows = view.rows;


        view.destroy();
        return rows;
    }

    /**
     * Create a View on this data.
     *
     * Similar to executeQuery(), but data will be returned as a View which can be
     * refreshed as the underlying facts in the cube are updated.  Useful for binding
     * to grids and efficiently displaying changing results in the cube.
     *
     * Note: Applications should call the disconnect() or destroy() method on the View
     * returned when appropriate to avoid unnecessary processing.
     *
     * @param {Object} c - config object.
     * @param {Query} c.query - query to be used to construct this view.
     * @param {Store} [c.store] - Store to be loaded/reloaded with data from this view.
     *      To receive data only, use the 'rows' property of the returned object instead.
     * @param {boolean} [c.connect] - true to update View automatically when data in
     *      the underlying cube is changed. Default false.
     * @returns {View}.
     */
    createView({query, store, connect = false}) {
        query = new Query({...query, cube: this});
        return new View({query, store, connect});
    }

    //-------------------
    // Data Loading API
    //-------------------
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
        this.store.loadData(rawData);
        this._info = Object.freeze(info);
        this._connectedViews.forEach(view => view.noteCubeLoaded());
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
        const changeLog = this.store.updateData(rawData);

        // 2) Process info
        const infoUpdated = isEmpty(info);
        if (!isEmpty(info)) {
            this._info = {...this._info, info};
        }

        // 3) Notify connected views
        if (changeLog || infoUpdated) {
            this._connectedViews.forEach(view => {
                view.noteCubeUpdated(changeLog, infoUpdated);
            });
        }
    }

    //---------------------
    // Implementation
    //---------------------
    parseFields(fields = []) {
        return fields.map(f => f instanceof CubeField ? f : new CubeField(f));
    }

    destroy() {
        this._connectedViews.forEach(v => v.disconnect());
    }
}


/**
 * @callback LockFn
 *
 * Function to be called for each node to aggregate to determine if it should be "locked",
 * preventing drilldown into its children. If true returned for a node, no drilldown will be
 * allowed, and the row will be marked with a boolean "locked" property.
 *
 * @param {AggregateRow} row - node to be potentially locked.
 * @returns boolean
 */