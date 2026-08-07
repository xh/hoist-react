/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {isEmpty} from 'lodash';
import {BucketSpec} from '../BucketSpec';
import {CubeField} from '../CubeField';
import {View} from '../View';
import {ViewRowData} from '../ViewRowData';
import {BaseRow} from './BaseRow';
import {RowUpdate} from './RowUpdate';

/**
 * Row within a dataset produced by a Cube / View that aggregates values from its children. Holds
 * all aggregation state and machinery, keeping it off the far more numerous {@link LeafRow}.
 *
 * The concrete subclasses {@link AggregateRow} and {@link BucketRow} group their children by a
 * dimension value and a dynamic bucket, respectively.
 *
 * This is an internal data structure - {@link ViewRowData} is the public row-level data API.
 */
export abstract class ParentRow extends BaseRow {
    // Parent rows always construct a full ViewRowData.
    declare data: ViewRowData;

    // `canAggregateFn` results by field name - null unless the view has such fields.
    private canAggResults: PlainObject = null;

    // Retained to re-derive `canAggregate` on row reuse.
    appliedDimensions: PlainObject = null;

    /** True if this row's children have been hidden from results by the Query's `lockFn`. */
    locked: boolean = false;

    /** The dimension or bucket by which this row groups its children, and its value here. */
    protected abstract get dimOrBucketName(): string;
    protected abstract get dimOrBucketVal(): any;

    protected init(children: BaseRow[], appliedDimensions: PlainObject) {
        const {data} = this;

        this.children = children;
        children.forEach(it => (it.parent = this));

        Object.assign(data, appliedDimensions);

        this.appliedDimensions = appliedDimensions;

        this.recomputeCanAggregate();
        this.computeAggregates();
    }

    // -----------
    // Data
    //-------------
    applyDataUpdate(childUpdates: RowUpdate[], updatedRowDatas: Set<PlainObject>) {
        const {parent, data, children} = this,
            ctx = this.view._aggContext,
            myUpdates = [];
        childUpdates.forEach(update => {
            const {field} = update,
                {name} = field;
            if (this.canAggregate(field)) {
                const oldValue = data[name],
                    newValue = field.aggregator.replace(children, oldValue, update, ctx);
                update.oldValue = oldValue;
                update.newValue = newValue;
                myUpdates.push(update);
                data[name] = newValue;
            }
        });

        if (!isEmpty(myUpdates)) {
            updatedRowDatas.add(this.data);
            if (parent) parent.applyDataUpdate(myUpdates, updatedRowDatas);
        }
    }

    //-------------------
    // Aggregation
    //--------------------
    recomputeCanAggregate(): string[] {
        let changes = null;
        this.view._canAggregateFnFields.forEach(field => {
            const {name} = field,
                can = this.aggEligible(field) && this.evalCanAggregate(field),
                results = (this.canAggResults ??= {});
            if (results[name] === can) return;

            results[name] = can;
            (changes ??= []).push(name);
        });
        return changes;
    }

    computeAggregates() {
        const {children, view, data} = this,
            ctx = view._aggContext;
        view.fields.forEach(field => {
            if (this.canAggregate(field)) {
                data[field.name] = field.aggregator.aggregate(children, field.name, ctx);
            }
        });
    }

    recomputeAggregatesForContextChange(force: string[]): boolean {
        const {view} = this;
        let changed = false;

        // 1) All complex aggregators need to be recomputed.
        view._complexAggFields.forEach(field => {
            if (this.recomputeAggregate(field)) changed = true;
        });

        // 2) Simple one may need to as well, if being forced.
        force?.forEach(name => {
            const field = view.getField(name);
            if (field.aggregator.dependsOnChildrenOnly && this.recomputeAggregate(field)) {
                changed = true;
            }
        });

        return changed;
    }

    // Re-aggregate a single field in place, returning true if its value changed.
    private recomputeAggregate(field: CubeField): boolean {
        if (!this.aggEligible(field)) return false;

        const {children, data, view} = this,
            {aggregator, name} = field,
            val = this.canAggregate(field)
                ? aggregator.aggregate(children, name, view._aggContext)
                : null;

        if (data[name] === val) return false;

        data[name] = val;
        return true;
    }

    // True if `field` should be aggregated on this row - it has an aggregator, is not one of the
    // dimensions applied here, and has not been denied by its `canAggregateFn`.
    private canAggregate(field: CubeField): boolean {
        return this.aggEligible(field) && this.canAggResults?.[field.name] !== false;
    }

    private aggEligible(field: CubeField): boolean {
        return !!field.aggregator && !this.appliedDimensions.hasOwnProperty(field.name);
    }

    private evalCanAggregate(field: CubeField): boolean {
        const {canAggregateFn} = field;
        return (
            !canAggregateFn ||
            canAggregateFn(
                this.dimOrBucketName,
                this.dimOrBucketVal,
                this.appliedDimensions,
                this.view._aggContext
            )
        );
    }
}

/**
 * Parent row aggregating data for a single value of a dimension.
 */
export class AggregateRow extends ParentRow {
    override get isAggregate() {
        return true;
    }

    /** The dimension for which this row is aggregating data. Null for a top-level summary row. */
    readonly dim: CubeField = null;
    readonly dimName: string = null;

    protected get dimOrBucketName(): string {
        return this.dimName;
    }

    // Value of `dim` on `data`, never aggregated over - or 'Total' for a dimension-less summary.
    protected get dimOrBucketVal(): any {
        return this.dim ? this.data[this.dimName] : this.dimName;
    }

    constructor(
        view: View,
        id: string,
        children: BaseRow[],
        dim: CubeField,
        strVal: string,
        appliedDimensions: PlainObject
    ) {
        super(view, id);
        const dimName = dim ? dim.name : 'Total';

        this.dim = dim;
        this.dimName = dimName;
        const data = (this.data = view.newRowData(id));
        data.cubeRowType = 'aggregate';
        data.cubeLabel = strVal;
        data.cubeDimension = dimName;

        this.init(children, appliedDimensions);
    }
}

/**
 * Parent row aggregating a dynamic child "bucket" of a dimension - i.e. a subset of a
 * dimension-level {@link AggregateRow}, as produced by a specified {@link BucketSpecFn}.
 */
export class BucketRow extends ParentRow {
    override get isBucket() {
        return true;
    }

    readonly bucketSpec: BucketSpec = null;
    readonly bucketVal: any = null;

    protected get dimOrBucketName(): string {
        return this.bucketSpec.name;
    }

    protected get dimOrBucketVal(): any {
        return this.bucketVal;
    }

    constructor(
        view: View,
        id: string,
        children: BaseRow[],
        bucketVal: any,
        bucketSpec: BucketSpec,
        appliedDimensions: PlainObject
    ) {
        super(view, id);

        this.bucketSpec = bucketSpec;
        this.bucketVal = bucketVal;
        const data = (this.data = view.newRowData(id));
        data.cubeRowType = 'bucket';
        data.cubeLabel = bucketSpec.labelFn(bucketVal);
        data.cubeDimension = bucketSpec.name;

        this.init(children, appliedDimensions);
    }

    protected override extendBuckets(parentBuckets: PlainObject): PlainObject {
        return {...parentBuckets, [this.bucketSpec.name]: this.bucketVal};
    }
}
