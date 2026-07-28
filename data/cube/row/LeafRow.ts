/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {StoreRecord, StoreRecordId} from '@xh/hoist/data';
import {isEmpty} from 'lodash';
import {View} from '../View';
import {ViewRowData} from '../ViewRowData';
import {BaseRow} from './BaseRow';
import {RowUpdate} from './RowUpdate';

/**
 * Row within a dataset produced by a Cube or View representing leaf-level data. These rows have a
 * 1-1 relationship with the source records loaded into the Cube's internal store - i.e. they are
 * not computed aggregates. How their data relates to the source record depends on
 * {@link View.useReferenceLeaves} - a zero-copy reference to the record's own data when leaves are
 * not exposed on results, or a per-View shallow copy limited to the queried fields when they are.
 *
 * This is an internal data structure - {@link ViewRowData} is the public row-level data API.
 */
export class LeafRow extends BaseRow {
    /**
     * ID of the `StoreRecord` within the Cube that was used to construct this leaf row.
     * Useful if you need to update this leaf's data via {@link Cube.updateDataAsync}.
     */
    readonly cubeRecordId: StoreRecordId;

    override get isLeaf() {
        return true;
    }

    constructor(view: View, id: string, rawRecord: StoreRecord) {
        super(view, id);
        this.cubeRecordId = rawRecord.id;

        if (view.useReferenceLeaves) {
            // Never exposed on results or stores - adopt the record's data outright
            this.data = rawRecord.data as ViewRowData;
        } else {
            const data = (this.data = new ViewRowData(id));
            data.cubeRowType = 'leaf';
            data.cubeLabel = rawRecord.id.toString();
            data.cubeDimension = null;

            view.fields.forEach(({name}) => {
                data[name] = rawRecord.data[name];
            });
        }
    }

    applyLeafDataUpdate(newRec: StoreRecord, updatedRowDatas: Set<PlainObject>) {
        const {view, data} = this,
            newData = newRec.data,
            updates = [],
            {useReferenceLeaves} = view;

        // 1) Calculate diff.
        view.fields.forEach(field => {
            const name = field.name,
                oldValue = data[name],
                newValue = newData[name];
            if (oldValue !== newValue) {
                updates.push(new RowUpdate(field, oldValue, newValue));
            }
        });

        // 2) Apply new values to our data. Always swap reference to avoid retaining old record.
        if (useReferenceLeaves) {
            this.data = newData as ViewRowData;
        } else {
            updates.forEach(({field, newValue}) => (data[field.name] = newValue));
        }

        // 3) Propagate any updates to ancestors and consumers
        if (!isEmpty(updates)) {
            if (!useReferenceLeaves) updatedRowDatas.add(data);
            this.parent?.applyDataUpdate(updates, updatedRowDatas);
        }
    }
}
