/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {RecordRefresh} from '@xh/hoist/data/cube';

export class Record {

    fields = null;
    parent = null;
    children = null;
    data = null;

    isLeaf = true;

    constructor(fields, data) {
        this.fields = fields;
   
        if (data) {
            const myData = this.data = {
                id: data.id,
                cubeLabel: data.cubeLabel
            };

            this.eachField(name => {
                myData[name] = data[name];
            });
        }
    }

    getId()         {return this.data.id}
    get(fieldName)  {return this.data[fieldName]}

    /**
     * Update the state of this record to reflect changed data.
     *
     * @param change RecordChange to be applied to this record.
     * @param appliedUpdates map of RecordUpdate that have occurred during this batch.
     */
    processChange(change, appliedUpdates = {}) {
        const id = this.getId(),
            data = this.data,
            parent = this.parent,
            prevChange = appliedUpdates[id];

        appliedUpdates[id] = (prevChange ? this.mergeUpdates(prevChange, change) : change);
        change.fieldChanges.forEach(it => {
            data[it.field.name] = it.newVal;
        });

        if (parent) {
            parent.processChildChange(change, appliedUpdates);
        }
    }

    eachField(fn) {
        return forEach(this.fields, fn);
    }

    //------------------------------------
    // Implementation
    //------------------------------------
    mergeUpdates(a, b) {
        if (a.type == 'ADD') return a;
        if (b.type == 'ADD') return b;
        if (a.type == 'REFRESH') return a;
        if (b.type == 'REFRESH') return b;

        // Could do better merging two updates of type 'CHANGE',
        // However, this is just used for appliedUpdates collection, so keep it simple.
        return new RecordRefresh(a.record);
    }

}

