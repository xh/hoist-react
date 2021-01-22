/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {isEmpty} from 'lodash';
import {BaseRow} from './BaseRow';
import {RowUpdate} from './RowUpdate';

/**
 * Object used to track leaf rows in a View
 */
export class LeafRow extends BaseRow {
    get isLeaf() {return true}

    constructor(view, rawRecord) {
        super(view, rawRecord.id);
        this.view = view;

        this.data.cubeLabel = rawRecord.id;
        view.fields.forEach(({name}) => {
            this.data[name] = rawRecord.data[name];
        });
    }

    applyDataUpdate(newRec, updatedRows) {
        const {view, parent, data} = this,
            newData = newRec.data,
            updates = [];

        view.fields.forEach(field => {
            const name = field.name,
                oldValue = data[name],
                newValue = newData[name];
            if (oldValue !== newValue) {
                data[name] = newValue;
                updates.push(new RowUpdate(field, oldValue, newValue));
            }
        });

        if (!isEmpty(updates)) {
            updatedRows.add(this.data);
            if (parent) parent.applyDataUpdate(updates, updatedRows);
        }
    }
}
