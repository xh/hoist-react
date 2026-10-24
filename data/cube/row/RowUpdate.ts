/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PlainObject} from '@xh/hoist/core';
import {CubeField} from '../CubeField';

/**
 * A change at a leaf affecting one field's aggregation, propagated up the leaf's ancestors to
 * adjust their aggregates in place.
 *
 * Passed to {@link Aggregator.replace}, which may use it to update an aggregate incrementally
 * rather than re-aggregating from scratch. Note that the field's own leaf value may be unchanged
 * when the update was triggered by a change to a field the aggregator {@link Aggregator.dependsOn}.
 */
export class RowUpdate {
    readonly field: CubeField;

    /** Values of the child row that changed - rewritten by each ancestor as the update propagates. */
    oldValue: any;
    newValue: any;

    /** Source record data of the originating leaf, before and after the update. */
    readonly leafOldData: PlainObject;
    readonly leafNewData: PlainObject;

    /** Values of the field at the originating leaf. */
    get leafOldValue(): any {
        return this.leafOldData[this.field.name];
    }

    get leafNewValue(): any {
        return this.leafNewData[this.field.name];
    }

    constructor(field: CubeField, leafOldData: PlainObject, leafNewData: PlainObject) {
        this.field = field;
        this.leafOldData = leafOldData;
        this.leafNewData = leafNewData;
        this.oldValue = this.leafOldValue;
        this.newValue = this.leafNewValue;
    }

    /** Independent copy for a second aggregation route - see {@link propagateUpdate}. */
    clone(): RowUpdate {
        const ret = new RowUpdate(this.field, this.leafOldData, this.leafNewData);
        ret.oldValue = this.oldValue;
        ret.newValue = this.newValue;
        return ret;
    }
}
