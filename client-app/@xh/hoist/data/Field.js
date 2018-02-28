/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 * Metadata for field.
 */
export class Field {

    name
    label
    allowNull
    defaultValue
    type

    /**
     * Construct this object.
     *
     * @param name, required.
     * @param type, one of [string, int, number, bool, json, date, day, auto]
     * @param label, optional, default to name
     * @param allowNull, default true.
     * @param defaultValue, default null.
     */
    constructor({
        name,
        type = 'auto',
        label = name,
        allowNull = true,
        defaultValue = null,
        ...rest
    }) {
        this.name = name;
        this.type = type;
        this.label = label;
        this.allowNull = allowNull;
        this.defaultValue = defaultValue;
        Object.assign(this, rest);
    }
}