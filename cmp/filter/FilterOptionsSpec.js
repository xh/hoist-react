/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {FieldFilter, FieldType, parseFieldValue} from '@xh/hoist/data';
import {fmtDate} from '@xh/hoist/format';
import {throwIf, stripTags} from '@xh/hoist/utils/js';
import {isString, isFunction, isEmpty, startCase} from 'lodash';

/**
 * Defines the FieldFilter options available for a given store field, and also
 * provides useful metadata for including these options in UI affordances.
 * Typically generated from a Store via @see FilterOptionsModel.
 *
 * Immutable.
 */
export class FilterOptionsSpec {

    /** @member {string} */
    field;

    /** @member {string} */
    displayName;

    /** @member {FieldType} */
    fieldType;

    /** @member {Array} */
    values;

    /** @member {function} */
    valueRenderer;

    /** @member {function} */
    valueParser;

    /** @member {*} */
    exampleValue;

    /**
     * FieldFilter type, either 'range' or 'value'. Determines what operations are applicable for the field.
     *      Type 'range' indicates the field should use mathematical / logical operations (i.e. '>', '>=', '<', '<=', '=', '!=')
     *      Type 'value' indicates the field should use equality operations against a set of values (i.e. '=', '!=', 'like')
     */
    get filterType() {
        const FT = FieldType;
        switch (this.fieldType) {
            case FT.INT:
            case FT.NUMBER:
            case FT.DATE:
            case FT.LOCAL_DATE:
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
     * Returns a string for an example value.
     */
    get example() {
        if (this.exampleValue) return this.renderValue(this.exampleValue);
        return this.fieldType.toUpperCase();
    }

    /**
     * @param {Object} c - FilterOptionsSpec configuration.
     * @property {string} c.field - Name of field
     * @property {string} [c.displayName] - Name suitable for display to user, defaults to field (e.g. 'Country')
     * @property {FieldType} [c.fieldType] - Type of field. @see Field.type for available options. Defaults to 'auto'.
     * @property {string[]} [c.operators] - Available operators. Defaults according to filterType.
     * @property {*[]} [c.values] - Available value options. Only applicable when filterType == 'value'
     * @property {function} [c.valueRenderer] - Function to return a readable string for a value.
     *      Receives (value, operator) as arguments.
     * @property {function} [c.valueParser] - Function to return a value from an entered string.
     *      Receives (value, operator) as arguments.
     * @property {*} [c.exampleValue] - An example value. Used by components to aid usability.
     */
    constructor({
        field,
        displayName,
        fieldType = FieldType.AUTO,
        values,
        operators,
        valueRenderer,
        valueParser,
        exampleValue
    }) {
        throwIf(!isString(field), 'FilterOptionsSpec requires a field');

        this.field = field;
        this.displayName = displayName ?? startCase(field);
        this.fieldType = fieldType;
        this.values = values;
        this.valueRenderer = valueRenderer;
        this.valueParser = valueParser;
        this.exampleValue = exampleValue;
        this._operators = operators ? operators.filter(it => FieldFilter.isValidOperator(it)) : null;

        Object.freeze(this);
    }

    renderValue(value, operator) {
        let ret;
        if (isFunction(this.valueRenderer)) {
            ret = this.valueRenderer(value, operator);
        } else if (this.fieldType === FieldType.DATE || this.fieldType === FieldType.LOCAL_DATE) {
            ret = fmtDate(value);
        } else {
            ret = value?.toString();
        }
        return stripTags(ret);
    }

    parseValue(value, operator) {
        if (isFunction(this.valueParser)) {
            return this.valueParser(value, operator);
        } else {
            return parseFieldValue(value, this.fieldType);
        }
    }
}