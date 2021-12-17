/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistBase, managed} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {forEachAsync} from '@xh/hoist/utils/async';
import {CubeField} from './CubeField';
import {Query} from './Query';
import {View} from './View';
import {Store} from '../Store';
import {defaultsDeep, isEmpty} from 'lodash';

/**
 * A data store that supports grouping, aggregating, and filtering data on multiple dimensions.
 *
 * This object is a wrapper around a Store.   It allows executing queries against that store
 * that performing filtering, grouping, and aggregating.  It also support the creation of
 * observable "views" for showing realtime updates to this data..
 */
export class Cube extends HoistBase {

    static RECORD_ID_DELIMITER = '>>';

    /** @member {Store} */
    @managed store;
    /** @member {LockFn} */
    lockFn;
    /** @member {BucketSpecFn} */
    bucketSpecFn;
    /** @member {Object} */
    @observable.ref
    info = null;

    /** @member {Set<View>} */
    _connectedViews = new Set();

    /**
     * @param {Object} c - Cube configuration.
     * @param {(CubeField[]|CubeFieldConfig[])} c.fields - CubeField instances or configs.
     * @param {{}} [fieldDefaults] - default configs applied to `CubeField` instances constructed
     *      internally by this Cube for its Store. {@see CubeFieldConfig} for options.
     * @param {Object[]} [c.data] - array of initial raw data.
     * @param {(function|string)} [c.idSpec] - {@see Store.idSpec} - default 'id'.
     * @param {function} [c.processRawData] - {@see Store.processRawData}
     * @param {Object} [c.info] - app-specific metadata to be associated with this data.
     * @param {LockFn} [c.lockFn] - optional function to be called for each aggregate node to
     *      determine if it should be "locked", preventing drilldown into its children.
     * @param {BucketSpecFn} [c.bucketSpecFn] - optional function to be called for each dimension
     *      during row generation to determine if the children of that dimension should be bucketed
     *      into additional dynamic dimensions.
     * @param {OmitFn} [c.omitFn] - optional function to be called on all single child rows during
     *      view processing.  Return true to omit the row.
     */
    constructor({
        fields,
        fieldDefaults = {},
        data = [],
        idSpec = 'id',
        processRawData,
        info = {},
        lockFn,
        bucketSpecFn,
        omitFn
    }) {
        super();
        makeObservable(this);
        this.store = new Store({
            fields: this.parseFields(fields, fieldDefaults),
            idSpec,
            processRawData,
            freezeData: false,
            idEncodesTreePath: true
        });
        this.store.loadData(data);
        this.info = info;
        this.lockFn = lockFn;
        this.bucketSpecFn = bucketSpecFn;
        this.omitFn = omitFn;
    }

    /** @returns {CubeField[]} - Fields configured for this Cube. */
    get fields() {return this.store.fields}

    /** @returns {CubeField[]} - Dimension Fields configured for this Cube. */
    get dimensions() {return this.fields.filter(it => it.isDimension)}

    /** @returns {StoreRecord[]} - records loaded in to this Cube. */
    get records() {return this.store.records}

    /** @returns {number} - count of currently connected, auto-updating Views. */
    get connectedViewCount() {return this._connectedViews.size}


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
            rows = view.result.rows;

        view.destroy();
        return rows;
    }

    /**
     * Create a View on this data.
     *
     * Creates a dynamic View of the cube data, based on a query.  Useful for binding to grids a
     * and efficiently displaying changing results in the cube.
     *
     * Note: Applications should call the disconnect() or destroy() method on the View
     * returned when appropriate to avoid unnecessary processing.
     *
     * @param {Object} c - config object.
     * @param {Query} c.query - query to be used to construct this view.
     * @param {(Store[]|Store)} [c.stores] - Stores to be loaded/reloaded with data from this view.
     *      To receive data only, use the 'results' property of the returned View instead.
     * @param {boolean} [c.connect] - true to update View automatically when data in
     *      the underlying cube is changed. Default false.
     * @returns {View}
     */
    createView({query, stores, connect = false}) {
        query = new Query({...query, cube: this});
        return new View({query, stores, connect});
    }

    /**
     * @param {View} view
     * @return {boolean} - true if the provided view is connected to this Cube for live updates.
     */
    viewIsConnected(view) {
        this._connectedViews.has(view);
    }

    /** @param {View} view - view to disconnect from live updates. */
    disconnectView(view) {
        this._connectedViews.delete(view);
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
     * Note that this method will update its views asynchronously, in order to avoid locking
     * up the browser when attached to multiple expensive views.
     *
     * @param {Object[]} rawData - flat array of lowest/leaf level data rows.
     * @param {Object} info - optional metadata to associate with this cube/dataset.
     */
    async loadDataAsync(rawData, info = {}) {
        this.store.loadData(rawData);
        this.setInfo(info);
        await forEachAsync(
            this._connectedViews,
            (v) => v.noteCubeLoaded()
        );
    }

    /**
     * Update this cube with incremental data set changes and/or info.
     * This method largely delegates to {@see Store.updateData()} - see that method for more info.
     *
     * Note that this method will update its views asynchronously in order to avoid locking
     * up the browser when attached to multiple expensive views.
     *
     * @param {(Object[]|StoreTransaction)} rawData
     * @param {Object} infoUpdates - new key-value pairs to be applied to existing info on this cube.
     */
    async updateDataAsync(rawData, infoUpdates) {
        // 1) Process data
        const changeLog = this.store.updateData(rawData);

        // 2) Process info
        const hasInfoUpdates = !isEmpty(infoUpdates);
        if (hasInfoUpdates) this.setInfo({...this.info, ...infoUpdates});

        // 3) Notify connected views
        if (changeLog || hasInfoUpdates) {
            await forEachAsync(
                this._connectedViews,
                (v) => v.noteCubeUpdated(changeLog)
            );
        }
    }

    /** Clear any/all data and info from this Cube. */
    async clearAsync() {
        await this.loadDataAsync([]);
    }

    /**
     * Populate the metadata associated with this cube.
     * @param {Object} infoUpdates - new key-value pairs to be applied to existing info on this cube.
     */
    updateInfo(infoUpdates = {}) {
        this.setInfo({...this.info, ...infoUpdates});
        this._connectedViews.forEach((v) => v.noteCubeUpdated(null));
    }


    //---------------------
    // Implementation
    //---------------------
    @action
    setInfo(info) {
        this.info = Object.freeze(info);
    }

    parseFields(fields = [], defaults) {
        return fields.map(f => {
            if (f instanceof CubeField) return f;

            if (!isEmpty(defaults)) {
                f = defaultsDeep({}, f, defaults);
            }

            return new CubeField(f);
        });
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
 * @param {(AggregateRow|BucketRow)} row - node to be potentially locked.
 * @returns boolean
 */

/**
 * @callback OmitFn
 *
 * Function to be called for each single child during row generation to determine if
 * it should be skipped.  Useful for removing aggregates that are degenerate due to context.
 *
 * @param {(AggregateRow|BucketRow)} row - node to be potentially locked.
 * @returns boolean
 */

/**
 * @callback BucketSpecFn
 *
 * Function to be called for each dimension to determine if children of said dimension should be
 * bucketed into additional dynamic dimensions.
 *
 * @param {BaseRow[]} rows - the rows being checked for bucketing
 * @returns {BucketSpec|null} - a BucketSpec for configuring the bucket to place child rows into,
 *      or null to perform no bucketing
 */
