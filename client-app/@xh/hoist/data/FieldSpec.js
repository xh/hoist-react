/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 * Metadata for field.
 */
export class FieldSpec {

    name
    label
    allowNull
    defaultValue
    type
    lookup

    lookupValues = null;

    constructor({
        name,
        type = 'string',      // [string, int, number, bool, json, date, day]
        label,
        allowNull = true,
        defaultValue = null,
        lookup = null
    }) {
        this.name = name;
        this.type = type;
        this.label = label;
        this.allowNull = allowNull;
        this.defaultValue = defaultValue;
        this.lookup = lookup;
    }
}