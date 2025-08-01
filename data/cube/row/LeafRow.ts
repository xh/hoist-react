/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {StoreRecord, StoreRecordId} from '@xh/hoist/data';
import {isEmpty} from 'lodash';
import {View} from '../View';
import {BaseRow} from './BaseRow';
import {RowUpdate} from './RowUpdate';

/**
 * Represents a leaf row returned by a {@link View} or call to {@link Cube.executeQuery}.
 *
 * These rows are 1-1 with the source records loaded into the Cube's internal store - i.e. they are
 * not computed aggregates - although the data they contain is a shallow copy of the original and
 * limited to the fields requested by the View / Query that produced them.
 */
export class LeafRow extends BaseRow {
    /**
     * Id of the StoreRecord within the Cube that was used to construct this leaf row.
     * Useful if you need to update this leaf's data via {@link Cube.updateDataAsync}.
     */
    readonly cubeRecordId: StoreRecordId;

    override get isLeaf() {
        return true;
    }

    constructor(view: View, id: string, rawRecord: StoreRecord) {
        super(view, id);

        this.cubeRecordId = rawRecord.id;
        this.data.cubeLabel = rawRecord.id.toString();
        this.data.cubeDimension = null;

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
