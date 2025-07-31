/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {HoistBase, managed, PlainObject} from '@xh/hoist/core';
import {ViewRowData} from '@xh/hoist/data/cube/ViewRowData';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {forEachAsync} from '@xh/hoist/utils/async';
import {CubeField, CubeFieldSpec} from './CubeField';
import {Query, QueryConfig} from './Query';
import {View} from './View';
import {Store, StoreRecordIdSpec, StoreTransaction} from '../Store';
import {StoreRecord} from '../StoreRecord';
import {AggregateRow} from './row/AggregateRow';
import {BucketRow} from './row/BucketRow';
import {BaseRow} from './row/BaseRow';
import {BucketSpec} from './BucketSpec';
import {defaultsDeep, isEmpty} from 'lodash';

export interface CubeConfig {
    fields: CubeField[] | CubeFieldSpec[];

    /** Default configs applied to all `CubeField`s constructed internally by this Cube. */
    fieldDefaults?: Partial<CubeFieldSpec>;

    /** Array of initial raw data. */
    data?: PlainObject[];

    /** See {@link StoreConfig.idSpec} */
    idSpec?: StoreRecordIdSpec;

    /** See {@link StoreConfig.processRawData} */
    processRawData?: (data: PlainObject) => PlainObject;

    /** Convenience bucket for app-specific metadata associated with the loaded dataset. */
    info?: PlainObject;

    /**
     * Optional function to be called for each aggregate node to determine if it should be "locked",
     * preventing drill-down into its children.
     */
    lockFn?: LockFn;

    /**
     * Optional function to be called for each dimension during row generation to determine if the
     * children of that dimension should be bucketed into additional dynamic dimensions.
     */
    bucketSpecFn?: BucketSpecFn;

    /**
     * Optional function to be called on all single child rows during view processing.
     * Return true to omit the row.
     */
    omitFn?: OmitFn;
}

/**
 * A data store that supports grouping, aggregating, and filtering data on multiple dimensions.
 *
 * This object is a wrapper around a "flat" Store containing leaf-level facts. It supports creating
 * Views on that data via structured Queries that can filter, group, and aggregate the flat source
 * data and produce a hierarchical result ready for use in (e.g.) tree grids and maps. Views can
 * be transiently created to run a Query once, on demand, or can be retained to provide efficient,
 * auto-updating results in response to updates to the underlying data.
 */
export class Cube extends HoistBase {
    static RECORD_ID_DELIMITER = '>>';

    @managed store: Store;
    lockFn: LockFn;
    bucketSpecFn: BucketSpecFn;
    omitFn: OmitFn;

    @observable.ref
    info: any = null;

    _connectedViews: Set<View> = new Set();

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
    }: CubeConfig) {
        super();
        makeObservable(this);
        this.store = new Store({
            fields: this.parseFields(fields, fieldDefaults),
            idSpec,
            processRawData: processRawData as any,
            freezeData: false,
            idEncodesTreePath: true
        });
        this.store.loadData(data);
        this.info = info;
        this.lockFn = lockFn;
        this.bucketSpecFn = bucketSpecFn;
        this.omitFn = omitFn;
    }

    /** Fields configured for this Cube. */
    get fields(): CubeField[] {
        return this.store.fields as CubeField[];
    }

    /** Dimension Fields configured for this Cube. */
    get dimensions(): CubeField[] {
        return this.fields.filter(it => it.isDimension);
    }

    /** Records loaded in to this Cube. */
    get records(): StoreRecord[] {
        return this.store.records;
    }

    /** True if this Cube contains no data / records. */
    get empty(): boolean {
        return this.store.empty;
    }

    /** Count of currently connected, auto-updating Views. */
    get connectedViewCount(): number {
        return this._connectedViews.size;
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
     * @param query - Config for query defining the shape of the view.
     * @returns data containing the results of the query as a hierarchical set of rows.
     */
    executeQuery(query: QueryConfig): ViewRowData[] {
        const q = new Query({...query, cube: this});
        const view = new View({query: q}),
            rows = view.result.rows;

        view.destroy();
        return rows;
    }

    /**
     * Create a View on this data.
     *
     * Creates a dynamic View of the cube data, based on a query.  Useful for binding to grids a
     * and efficiently displaying changing results in the Cube.
     *
     * Note: Applications should call {@link View.disconnect} or {@link View.destroy} on the View
     * created by this method when appropriate to avoid unnecessary processing.
     *
     * @param query - query to be used to construct this view.
     * @param stores - Stores to be loaded/reloaded with data from this view.
     *      To receive data only, use the 'results' property of the returned View instead.
     * @param connect - true to update View automatically when data in
     *      the underlying cube is changed. Default false.
     */
    createView({
        query,
        stores,
        connect = false
    }: {
        query: QueryConfig;
        stores?: Store[] | Store;
        connect?: boolean;
    }): View {
        return new View({
            query: new Query({...query, cube: this}),
            stores,
            connect
        });
    }

    /**
     * True if the provided view is connected to this Cube for live updates.
     */
    viewIsConnected(view: View): boolean {
        return this._connectedViews.has(view);
    }

    /** @param view - view to disconnect from live updates. */
    disconnectView(view: View) {
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
     * @param rawData - flat array of lowest/leaf level data rows.
     * @param info - optional metadata to associate with this cube/dataset.
     */
    async loadDataAsync(rawData: PlainObject[], info: PlainObject = {}): Promise<void> {
        this.store.loadData(rawData);
        this.setInfo(info);
        await forEachAsync(this._connectedViews, v => v.noteCubeLoaded());
    }

    /**
     * Update this cube with incremental data set changes and/or info.
     * This method largely delegates to {@link Store.updateData} - see that method for more info.
     *
     * Note that this method will update its views asynchronously in order to avoid locking
     * up the browser when attached to multiple expensive views.
     *
     * @param rawData - data changes to process. If provided as an array, rawData will be processed
     *      into adds and updates, with updates determined by matching existing records by ID.
     * @param infoUpdates - new key-value pairs to be applied to existing info on this cube.
     */
    async updateDataAsync(
        rawData: PlainObject[] | StoreTransaction,
        infoUpdates: PlainObject = {}
    ): Promise<void> {
        // 1) Process data
        const changeLog = this.store.updateData(rawData);

        // 2) Process info
        const hasInfoUpdates = !isEmpty(infoUpdates);
        if (hasInfoUpdates) this.setInfo({...this.info, ...infoUpdates});

        // 3) Notify connected views
        if (changeLog || hasInfoUpdates) {
            await forEachAsync(this._connectedViews, v => v.noteCubeUpdated(changeLog));
        }
    }

    /** Clear any/all data and info from this Cube. */
    async clearAsync() {
        await this.loadDataAsync([]);
    }

    /**
     * Populate the metadata associated with this cube.
     * @param infoUpdates - new key-value pairs to be applied to existing info on this cube.
     */
    updateInfo(infoUpdates: PlainObject = {}) {
        this.setInfo({...this.info, ...infoUpdates});
        this._connectedViews.forEach(v => v.noteCubeUpdated(null));
    }

    //---------------------
    // Implementation
    //---------------------
    @action
    private setInfo(info: PlainObject) {
        this.info = Object.freeze(info);
    }

    private parseFields(fields = [], defaults) {
        return fields.map(f => {
            if (f instanceof CubeField) return f;

            if (!isEmpty(defaults)) {
                f = defaultsDeep({}, f, defaults);
            }

            return new CubeField(f);
        });
    }

    override destroy() {
        this._connectedViews.forEach(v => v.disconnect());
        super.destroy();
    }
}

/**
 * Function to be called for each node to aggregate to determine if it should be "locked",
 * preventing drilldown into its children. If true returned for a node, no drilldown will be
 * allowed, and the row will be marked with a boolean "locked" property.
 */
export type LockFn = (row: AggregateRow | BucketRow) => boolean;

/**
 * Function to be called for each node during row generation to determine if it should be
 * skipped in tree output.  Useful for removing aggregates that are degenerate due to context.
 * Note that skipping in this way has no effect on aggregations -- all children of this node are
 * simply promoted to their parent node.
 */
export type OmitFn = (row: AggregateRow | BucketRow) => boolean;

/**
 * Function to be called for each dimension to determine if children of said dimension should be
 * bucketed into additional dynamic dimensions.
 *
 * @param rows - the rows being checked for bucketing
 * @returns a BucketSpec for configuring the bucket to place child rows into, or null to perform
 *          no bucketing
 */
export type BucketSpecFn = (rows: BaseRow[]) => BucketSpec;
