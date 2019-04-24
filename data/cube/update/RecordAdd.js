/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {RecordUpdate} from './RecordUpdate';

/**
 * Represents an addition of a record.
 */
export class RecordAdd extends RecordUpdate {
    type = 'ADD';

    constructor(record) {
        super(record);
    }
}