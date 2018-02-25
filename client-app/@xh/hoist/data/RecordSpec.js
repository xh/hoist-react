/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {FieldSpec} from './FieldSpec';

/**
 * Metadata for Record.
 */
export class RecordSpec {

    fields

    constructor({
        fields = []   // field or configs that can be used to create a field
    }) {
        this.fields = fields.map(f => {
            return !(f instanceof FieldSpec) ? f : new FieldSpec(f);
        });
    }
}