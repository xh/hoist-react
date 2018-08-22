/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {observable, action} from '@xh/hoist/mobx';
import {without} from 'lodash';
import {BaseStore} from './BaseStore';

/**
 * Internal Recordset for Store.
 *
 * @private
 */
export class RecordSet {

    map;   // Map of all records, by id
    list;  // Ordered list of records, starting at root

    constructor(records) {
        this.list = records;
        this.map = new Map();
        records.forEach(r => this.addToMap(r));
    }

    get count() {
        return this.map.size;
    }

    removeRecord(record) {
        this.removeRecordAndChildrenFromMap(rec);
        const parent = rec.parent;
        if (parent) {
            parent = parent.removeChild(rec);
            this._fullMap.set(parent.id, parent);
        } else {
            list = list.without
        }
    }

    //------------------
    // Implementation
    //------------------
    addToMap(record) {
        this.map.set(record.id, record);
        record.children.forEach(c => addToMap(c));
    }

    removeRecordAndChildrenFromMap(rec) {
        this._recordsMap.delete(rec.id);
        rec.allChildren.each(child => this.removeRecordAndChildrenFromMap(child));
    }
}