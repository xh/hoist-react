/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {HoistBase, managed, PlainObject, Some} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {forEachAsync} from '@xh/hoist/utils/async';
import {defaultsDeep, isEmpty} from 'lodash';
import {Store, StoreRecordIdSpec, StoreTransaction} from '../Store';
import {StoreRecord} from '../StoreRecord';
import {BucketSpec} from './BucketSpec';
import {CubeField, CubeFieldSpec} from './CubeField';
import {Query, QueryConfig} from './Query';
import {AggregateRow} from './row/AggregateRow';
import {BaseRow} from './row/BaseRow';
import {BucketRow} from './row/BucketRow';
import {View} from './View';
import {ViewRowData} from './ViewRowData';

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
 * Function to be called for rows making up an aggregated dimension to determine if the children of
 * that dimension should be dynamically bucketed into additional sub-groupings.
 *
 * An example use case would be a grouped collection of portfolio positions, where any closed
 * positions are identified as such by this function and bucketed into a "Closed" sub-grouping,
 * without having to add something like an "openClosed" dimension that would apply to all
 * aggregations and create an unwanted "Open" grouping.
 *
 * @param rows - the rows being checked for bucketing
 * @returns {@link BucketSpec} for dynamic sub-aggregations, or null to perform no bucketing.
 */
export type BucketSpecFn = (rows: BaseRow[]) => BucketSpec;

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
            processRawData: processRawData,
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

    /** Timestamp (ms) of when the Cube data was last updated */
    get lastUpdated(): number {
        return this.store.lastUpdated;
    }

    /** Count of currently connected, auto-updating Views. */
    get connectedViewCount(): number {
        return this._connectedViews.size;
    }

    getField(name: string): CubeField {
        return this.store.getField(name) as CubeField;
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
        const q = new Query({...query, cube: this}),
            view = new View({query: q}),
            rows = view.result.rows;

        view.destroy();
        return rows;
    }

    /**
     * Create a dynamic {@link View} of the cube data based on a query. Unlike the static snapshot
     * returned by {@link Cube.executeQuery}, a View created with this method can be configured
     * with `connect:true` to automatically update as the underlying data in the Cube changes.
     *
     * Provide one or more `stores` to automatically populate them with the aggregated data returned
     * by the query, or read the returned {@link View.result} directly.
     *
     * When the returned View is no longer needed, call {@link View.destroy} (or save a reference
     * via an `@managed` model property) to avoid unnecessary processing.
     *
     * @param query - query to be used to construct this view.
     * @param stores - Stores to be automatically loaded/reloaded with View results.
     * @param connect - true to update View automatically when data in the underlying Cube changes.
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

    /** True if the provided view is connected to this Cube for live updates. */
    viewIsConnected(view: View): boolean {
        return this._connectedViews.has(view);
    }

    /** Cease pushing further updates to this Cube's data into a previously connected View. */
    disconnectView(view: View) {
        this._connectedViews.delete(view);
    }

    /** Connect a View to this Cube for live updates. */
    connectView(view: View) {
        if (this.viewIsConnected(view)) return;

        this._connectedViews.add(view);

        // If the view is not up-to-date with the current cube data, then reload the view
        if (view.cubeDataUpdated !== this.lastUpdated) {
            view.noteCubeLoaded();
        }
    }

    //-------------------
    // Data Loading API
    //-------------------
    /**
     * Populate this cube with a new dataset.
     * This method largely delegates to {@link Store.loadData} - see that method for more info.
     *
     * Note that this method will update its views asynchronously in order to avoid locking up the
     * browser when attached to multiple expensive views.
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

    /**
     * Similar to `updateDataAsync`, but intended for modifying individual field values in a local
     * uncommitted state - i.e. when updating via an inline grid editor or similar control. Like
     * `updateDataAsync`, this method will update its views asynchronously.
     *
     * This method largely delegates to {@link Store.modifyRecords} - see that method for more info.
     *
     * @param modifications - field-level modifications to apply to existing
     *      Records in this Cube. Each object in the list must have an `id` property identifying
     *      the StoreRecord to modify, plus any other properties with updated field values to apply,
     *      e.g. `{id: 4, quantity: 100}, {id: 5, quantity: 99, customer: 'bob'}`.
     */
    async modifyRecordsAsync(modifications: Some<PlainObject>): Promise<void> {
        const changeLog = this.store.modifyRecords(modifications);

        if (changeLog) {
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
