/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {clone, isEqual} from 'lodash';

/**
 * Core data for Store.
 *
 * This object is intended to be created and managed internally by Store implementations.
 */
export class Record {

    static RESERVED_FIELD_NAMES = ['store', 'parentId', 'xhTreePath']

    /** @member {string} - unique ID. */
    id;

    /** @member {Store} - source store for this record. */
    store;

    /** @member {string} - id of parent of this record, or null if there is no parent. */
    parentId;

    /** @private {String[]} - unique path.  For agGrid implementation. */
    xHTreePath;

    /**
     * Will apply basic validation and conversion (e.g. 'date' will convert from UTC time to
     * a JS Date object). An exception will be thrown if the validation or conversion fails.
     */
    constructor({raw, parent, store}) {
        const id = raw.id;

        this.id = id;
        this.parentId = parent ? parent.id : null;
        this.store = store;
        this.xhTreePath = parent ? [...parent.xhTreePath, id] : [id];

        store.fields.forEach(f => {
            this[f.name] = f.parseVal(raw[f.name]);
        });
    }

    isEqual(rec) {
        return (
            this.id == rec.id &&
            this.parentId == rec.parentId &&
            this.store == rec.store &&
            this.store.fields.every(f => f.isEqual(this[f.name], rec[f.name]))
        );
    }
}

