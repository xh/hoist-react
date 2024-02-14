/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {isEmpty} from 'lodash';
import {StoreRecord} from '../../StoreRecord';
import {View} from '../View';
import {BaseRow} from './BaseRow';
import {RowUpdate} from './RowUpdate';

/**
 * Object used to track leaf rows in a View
 */
export class LeafRow extends BaseRow {
    override get isLeaf() {
        return true;
    }

    constructor(view: View, id: string, rawRecord: StoreRecord) {
        super(view, id);
        this.data.cubeLabel = rawRecord.id;
        view.fields.forEach(({name}) => {
            this.data[name] = rawRecord.data[name];
        });
    }

    applyLeafDataUpdate(newRec: StoreRecord, updatedRowDatas: Set<PlainObject>) {
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
            updatedRowDatas.add(this.data);
            if (parent) parent.applyDataUpdate(updates, updatedRowDatas);
        }
    }
}
