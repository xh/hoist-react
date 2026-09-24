/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {CubeField} from '../CubeField';

/**
 * A single field value change, propagated up a row's ancestors to adjust their aggregations.
 *
 * Passed to {@link Aggregator.replace}, which may use it to update an aggregate incrementally
 * rather than re-aggregating from scratch.
 */
export class RowUpdate {
    readonly field: CubeField;

    /** Values of the child row that changed - rewritten by each ancestor as the update propagates. */
    oldValue: any;
    newValue: any;

    /** Values at the originating leaf - a running total over leaves can apply this delta at any level. */
    readonly leafOldValue: any;
    readonly leafNewValue: any;

    /**
     * Set when the originating leaf joined or left the aggregation rather than changing value - its
     * old or new value, respectively, is then null. Aggregators that count leaves, or treat a null
     * value as significant, must distinguish the two.
     */
    readonly leafChange: 'add' | 'remove' = null;

    constructor(field: CubeField, oldValue: any, newValue: any, leafChange?: 'add' | 'remove') {
        this.field = field;
        this.oldValue = this.leafOldValue = oldValue;
        this.newValue = this.leafNewValue = newValue;
        if (leafChange) this.leafChange = leafChange;
    }
}
