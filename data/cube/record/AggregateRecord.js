/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {FieldChange, RecordChange} from '@xh/hoist/data/cube';
import {Record} from './Record';

export class AggregateRecord extends Record {

    isLeaf = false;
    dim = null;

    constructor(fields, id, children, dim, val) {
        super(fields);

        const data = {id, cubeLabel: val};
        if (dim) {
            this.dim = dim;
            data[dim.name] = val;
        }
        this.data = data;

        children.forEach(it => it.parent = this);
        this.children = children;

        this.computeAggregates();
    }

    computeAggregates() {
        this.eachField((field, name) => {
            if (field !== this.dim) {
                const aggregator = field.aggregator;
                this.data[name] = aggregator.aggregate(this.children, name);
            }
        });
    }
}