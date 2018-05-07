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
     * @param {string} name - unique key representing this field.
     * @param {string} type - one of ['string', 'number', 'bool', 'json','date','day', 'auto']
     *      Default 'auto' indicates no conversion.
     * @param {string} label - label for display
     * @param {boolean} nullable - can this field contain null?
     * @param {*} defaultValue - value to be used for records with a null, or non-existent value.
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