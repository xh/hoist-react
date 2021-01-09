/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {isEmpty} from 'lodash';
import {RowUpdate} from './RowUpdate';

/**
 * @private
 *
 * object used to track leaf rows in a View
 */
export function createLeafRow(view, rawRecord) {
    const data = {};
    data._meta = new LeafMeta(data, view, rawRecord);
    return data;
}


class LeafMeta {

    data = null;
    view = null;
    parent = null;

    get isLeaf() {return true}

    constructor(data, view, rawRecord) {
        this.data = data;
        this.view = view;

        data.id = rawRecord.id;
        data.cubeLabel = rawRecord.id;
        view.fields.forEach(({name}) => {
            data[name] = rawRecord.data[name];
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
