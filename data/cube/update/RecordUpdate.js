/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {} from 'lodash';

/**
 * Represents an update to an existing record.
 */
export class RecordUpdate {
    record = null;
    type = null;

    constructor(record) {
        this.record = record;
    }
}