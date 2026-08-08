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

    // Level of this row within the query's dimensions - bucket rows share the level of the
    // aggregate row above them. Keys the View's per-level field lists.
    private depth: number = null;

    // Values of the dimensions applied at this row, retained only to hand to a `canAggregateFn`.
    private appliedDimensions: PlainObject = null;

    /** True if this row's children have been hidden from results by the Query's `lockFn`. */
    locked: boolean = false;

    /** The dimension or bucket by which this row groups its children, and its value here. */
    protected abstract get dimOrBucketName(): string;
    protected abstract get dimOrBucketVal(): any;

    protected init(children: BaseRow[], appliedDimensions: PlainObject, depth: number) {
        const {view} = this;

        this.children = children;
        children.forEach(it => (it.parent = this));

        Object.assign(this.data, appliedDimensions);
        this.depth = depth;

        // Needed to re-evaluate any `canAggregateFn` - clone, as the View mutates its copy as it
        // moves across sibling groups.
        if (!isEmpty(view._canAggregateFnFieldsByDepth[depth])) {
            this.appliedDimensions = {...appliedDimensions};
        }

        this.recomputeCanAggregate();

        // initial computation of aggregates
        const {data, canAggResults} = this,
            ctx = view._aggContext;
        view._aggFieldsByDepth[this.depth].forEach(({aggregator, name}) => {
            if (canAggResults?.[name] !== false) {
                data[name] = aggregator.aggregate(children, name, ctx);
            }
        });
    }

    // -----------
    // Data
    //-------------
    applyDataUpdate(childUpdates: RowUpdate[], updatedRowDatas: Set<PlainObject>) {
        const {parent, data, children, canAggResults, view} = this,
            ctx = view._aggContext,
            aggFieldNames = view._aggFieldNamesByDepth[this.depth],
            myUpdates = [];
        childUpdates.forEach(update => {
            const {field} = update,
                {name} = field;
            if (aggFieldNames.has(name) && canAggResults?.[name] !== false) {
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
    /** Re-evaluate this row's `canAggregateFn` fields, returning any that changed - else null. */
    recomputeCanAggregate(): string[] {
        let changes = null;
        this.view._canAggregateFnFieldsByDepth[this.depth].forEach(field => {
            const {name} = field,
                can = this.evalCanAggregate(field),
                results = (this.canAggResults ??= {});
            if (results[name] === can) return;

            results[name] = can;
            (changes ??= []).push(name);
        });
        return changes;
    }

    recomputeAggregatesForContextChange(force: string[]): boolean {
        const {view} = this;
        let changed = false;

        // 1) All complex aggregators need to be recomputed.
        view._complexAggFieldsByDepth[this.depth].forEach(field => {
            if (this.recomputeAggregate(field)) changed = true;
        });

        // 2) Simple ones may need to as well, if being forced.
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
        const {children, data, view} = this,
            {aggregator, name} = field,
            val =
                this.canAggResults?.[name] !== false
                    ? aggregator.aggregate(children, name, view._aggContext)
                    : null;

        if (data[name] === val) return false;

        data[name] = val;
        return true;
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
        appliedDimensions: PlainObject,
        depth: number
    ) {
        super(view, id);
        const dimName = dim ? dim.name : 'Total';

        this.dim = dim;
        this.dimName = dimName;
        const data = (this.data = view.newRowData(id));
        data.cubeRowType = 'aggregate';
        data.cubeLabel = strVal;
        data.cubeDimension = dimName;

        this.init(children, appliedDimensions, depth);
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
        appliedDimensions: PlainObject,
        depth: number
    ) {
        super(view, id);

        this.bucketSpec = bucketSpec;
        this.bucketVal = bucketVal;
        const data = (this.data = view.newRowData(id));
        data.cubeRowType = 'bucket';
        data.cubeLabel = bucketSpec.labelFn(bucketVal);
        data.cubeDimension = bucketSpec.name;

        this.init(children, appliedDimensions, depth);
    }

    protected override extendBuckets(parentBuckets: PlainObject): PlainObject {
        return {...parentBuckets, [this.bucketSpec.name]: this.bucketVal};
    }
}
