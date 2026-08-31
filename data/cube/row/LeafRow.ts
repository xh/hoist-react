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
 * not computed aggregates.
 *
 * Note that `data` on this class is a minimal `PlainObject` - only queried field values are
 * guaranteed. The concrete subclasses {@link ExposedLeafRow} and {@link HiddenLeafRow} implement
 * the two available data strategies, selected per-View via {@link View.exposesLeaves}.
 *
 * This is an internal data structure - {@link ViewRowData} is the public row-level data API.
 */
export abstract class LeafRow extends BaseRow {
    /**
     * Source `StoreRecord` in the Cube, current as of the last applied update.
     */
    cubeRecord: StoreRecord;

    /**
     * ID of the `StoreRecord` within the Cube that was used to construct this leaf row.
     */
    get cubeRecordId(): StoreRecordId {
        return this.cubeRecord.id;
    }

    override get isLeaf() {
        return true;
    }

    override getVisibleDatas(): ViewRowData {
        return this.data as ViewRowData;
    }

    constructor(view: View, id: string, rawRecord: StoreRecord) {
        super(view, id);
        this.cubeRecord = rawRecord;
    }

    applyLeafDataUpdate(
        newRec: StoreRecord,
        updatedRowDatas: Set<PlainObject>,
        changedFields: Set<string>
    ) {
        this.cubeRecord = newRec;
        const {view, data} = this,
            newData = newRec.data,
            updates = [];

        // 1) Calculate diff. Calculated fields are skipped - they hold no stored value to diff,
        // and their read-time getters are always current.
        view._nonCalculatedFields.forEach(field => {
            const name = field.name,
                oldValue = data[name],
                newValue = newData[name];
            if (oldValue !== newValue) {
                updates.push(new RowUpdate(field, oldValue, newValue));
                changedFields.add(name);
            }
        });

        // 2) Apply new values to our data, as per subclass strategy.
        this.applyUpdatedData(updates, newData, updatedRowDatas);

        // 3) Propagate any updates to ancestors and consumers.
        if (!isEmpty(updates)) {
            this.parent?.applyDataUpdate(updates, updatedRowDatas);
        }
    }

    protected abstract applyUpdatedData(
        updates: RowUpdate[],
        newData: PlainObject,
        updatedRowDatas: Set<PlainObject>
    ): void;
}

/**
 * Leaf row exposed on results - i.e. when the Query sets {@link Query.includeLeaves} or
 * {@link Query.provideLeaves}. Holds a per-View {@link ViewRowData} whose queried field values
 * are read through prototype getters over an own `_src` reference to the source record's data,
 * avoiding a per-leaf copy. See {@link View.newLeafRowData}.
 */
export class ExposedLeafRow extends LeafRow {
    declare data: ViewRowData;

    constructor(view: View, id: string, rawRecord: StoreRecord) {
        super(view, id, rawRecord);

        const data = (this.data = view.newLeafRowData(id, rawRecord.data));
        data.cubeLabel = rawRecord.id.toString();
    }

    protected override applyUpdatedData(
        updates: RowUpdate[],
        newData: PlainObject,
        updatedRowDatas: Set<PlainObject>
    ) {
        this.data._src = newData;
        if (!isEmpty(updates)) updatedRowDatas.add(this.data);
    }
}

/**
 * Leaf row never exposed on results, feeding aggregations only. Adopts a zero-copy reference to
 * its source record's own data object, where per-leaf copies would be pure overhead.
 *
 * The shared record data must never be mutated, and these rows are never published via
 * {@link ViewResult.leafMap}.
 */
export class HiddenLeafRow extends LeafRow {
    constructor(view: View, id: string, rawRecord: StoreRecord) {
        super(view, id, rawRecord);
        this.data = rawRecord.data;
    }

    // Never mutate shared record data. These leaves are not exposed on results, so their bucket
    // metadata would have no consumer anyway.
    override syncBuckets() {}

    protected override applyUpdatedData(updates: RowUpdate[], newData: PlainObject) {
        this.data = newData;
    }
}
