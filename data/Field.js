/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {startCase} from 'lodash';
/**
 * Metadata for a column or 'field' in a Store record.
 */
export class Field {

    name
    type
    label
    defaultValue

    /**
     * Construct this object.
     *
     * @param name, required.
     * @param type, one of [string, number, bool, json, date, day, auto], default 'auto' indicates no conversion
     *        or validation will be made.
     * @param label, optional, default to Start Case of 'name'.
     * @param nullable
     * @param defaultValue. Value to be used for records with a null, or non-existent value.
     */
    constructor({
        name,
        type = 'auto',
        label = startCase(name),
        nullable = true,
        defaultValue = null
    }) {
        this.name = name;
        this.type = type;
        this.label = label;
        this.nullable = nullable;
        this.defaultValue = defaultValue;
    }
}