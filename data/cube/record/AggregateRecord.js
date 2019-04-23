/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

//= require Record.js

Ext.define('XH.cube.record.AggregateRecord', {
    extend: XH.cube.record.Record,

    isLeaf: false,
    dim: null,

    constructor(fields, id, children, dim, val) {
        this.callParent([fields]);

        const data = this.data = {};
        data.id = id;
        data.cubeLabel = val;
        if (dim) {
            this.dim = dim;
            data[dim.name] = val;
        }

        children.forEach(it => it.parent = this);
        this.children = children;

        this.computeAggregates();
    },

    computeAggregates() {
        this.eachField((name, field) => {
            if (field !== this.dim) {
                const aggregator = field.aggregator;
                this.data[name] = aggregator.aggregate(this.children, name);
            }
        });
    },

    /**
     * Note that a child of this record has changed, and update the state of this
     * record accordingly.
     *
     * @param change, RecordChange that has occurred on a child of this record.
     * @param appliedUpdates, map of RecordUpdate that have occurred during this batch.
     */
    processChildChange(change, appliedUpdates) {
        const FieldChange = XH.cube.update.FieldChange,
            RecordChange = XH.cube.update.RecordChange,
            myFieldChanges = [],
            data = this.data,
            fields = this.fields,
            children = this.children;

        change.fieldChanges.forEach(fieldChange => {
            const name = fieldChange.field.name,
                field = fields[name];
            if (field) {
                const aggregator = field.aggregator,
                    oldVal = data[name],
                    newVal = aggregator.replace(children, oldVal, fieldChange);

                if (oldVal != newVal) {
                    myFieldChanges.push(new FieldChange(field, oldVal, newVal));
                }
            }
        });

        if (myFieldChanges.length) {
            const myChange = new RecordChange(this, myFieldChanges);
            this.processChange(myChange, appliedUpdates);
        }
    }
});