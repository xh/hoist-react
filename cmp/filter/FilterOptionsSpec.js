/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Filter} from '@xh/hoist/data';
import {fmtDate} from '@xh/hoist/format';
import {throwIf, stripTags} from '@xh/hoist/utils/js';
import {isString, isEmpty, startCase} from 'lodash';

/**
 * Defines the filter options available for a given store field, and also
 * provides useful metadata for including these options in UI affordances.
 * Typically generated from a Store via @see FilterOptionsModel
 */
export class FilterOptionsSpec {

    /** @member {string} */
    field;

    /** @member {string} */
    displayName;

    /** @member {string} */
    fieldType;

    /** @member {Array} */
    values;

    /** @member {function} */
    valueRenderer;

    /**
     * Filter type, either 'range' or 'value'. Determines what operations are applicable for the field.
     *      Type 'range' indicates the field should use mathematical / logical operations (i.e. '>', '>=', '<', '<=', '=', '!=')
     *      Type 'value' indicates the field should use equality operations against a set of values (i.e. '=', '!=', 'like')
     */
    get filterType() {
        switch (this.fieldType) {
            case 'int':
            case 'number':
            case 'date':
            case 'localDate':
                return 'range';
            default:
                return 'value';
        }
    }

    /**
     * Available operators. typically derived from filterType, optionally set in constructor
     */
    get operators() {
        if (!isEmpty(this._operators)) return this._operators;
        return this.filterType === 'value' ?
            ['=', '!=', 'like'] :
            ['>', '>=', '<', '<=', '=', '!='];
    }

    /**
     * @param {Object} c - FilterOptionsSpec configuration.
     * @property {string} c.field - Name of field
     * @property {string} [c.displayName] - Name suitable for display to user, defaults to field (e.g. 'Country')
     * @property {string} [c.fieldType] - Type of field. @see Field.type for available options. Defaults to 'auto'.
     * @property {string[]} [c.operators] - Available operators. Defaults according to filterType.
     * @property {*[]} [c.values] - Available value options. Only applicable when filterType == 'value'
     * @property {function} [c.valueRenderer] - Function to return a readable string for a value.
     */
    constructor({
        field,
        displayName,
        fieldType = 'auto',
        values,
        operators,
        valueRenderer
    }) {
        throwIf(!isString(field), 'FilterOptionsSpec requires a field');

        this.field = field;
        this.displayName = displayName ?? startCase(field);
        this.fieldType = fieldType;
        this.values = values;
        this.valueRenderer = valueRenderer;
        this._operators = operators ? operators.filter(it => Filter.isValidOperator(it)) : null;
    }

    setValues(values) {
        this.values = values;
    }

    renderValue(value) {
        let ret = value?.toString();

        if (this.valueRenderer) {
            ret = this.valueRenderer(value);
        } else if (this.fieldType === 'date' || this.fieldType === 'localDate') {
            ret = fmtDate(value);
        }

        return stripTags(ret);
    }
}