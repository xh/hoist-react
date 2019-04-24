/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {RecordUpdate} from '@xh/hoist/data/cube/update/RecordUpdate';

/**
 * Represents a change to all fields of an existing record.
 */
export class RecordRefresh extends RecordUpdate {

    constructor(record) {
        super(record);
    }
}