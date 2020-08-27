/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {FieldFilter, FieldType, parseFieldValue} from '@xh/hoist/data';
import {fmtDate} from '@xh/hoist/format';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {stripTags} from '@xh/hoist/utils/js';
import {isFunction, isNil} from 'lodash';

/**
 * Defines the FieldFilter options available for a given Store Field and provides useful metadata
 * for including these options in UI affordances, including available data values for suggestion
 * if applicable / so configured.
 *
 * Apps should NOT instantiate this class directly. Instead {@see FilterChooserModel.fieldSpecs}
 * for the relevant config to set these options.
 *
 * @private and immutable.
 */
export class FieldSpec {

    /** @member {Field} */
    field;

    /** @member {string} */
    displayName;

    /** @member {string[]} */
    ops;

    /** @member {boolean} */
    suggestValues;

    /**
     * @member {?Array} - data values available for suggestion, or null if suggestions disabled or
     *      not supported by this object's filterType.
     */
    values;

    /** @member {FilterOptionValueRendererCb} */
    valueRenderer;

    /** @member {FilterOptionValueParserCb} */
    valueParser;

    /** @member {*} */
    exampleValue;

    /** @return {FieldType} */
    get fieldType() {return this.field.type}

    /**
     * @return {string} - 'range' or 'value' - determines operations supported by this field.
     *      Type 'range' indicates the field should use mathematical / logical operations
     *      ('>', '>=', '<', '<=', '=', '!='). Type 'value' indicates the field should use equality
     *      operators ('=', '!=', 'like') against a suggested exact value or user-provided input.
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

    get isRangeType() { return this.filterType === 'range'}
    get isValueType() { return this.filterType === 'value'}

    get isDateBasedFieldType() {
        const {fieldType} = this;
        return fieldType == FieldType.DATE || fieldType == FieldType.LOCAL_DATE;
    }

    get isNumericFieldType() {
        const {fieldType} = this;
        return fieldType == FieldType.INT || fieldType == FieldType.NUMBER;
    }

    get isBoolFieldType() {return this.fieldType == FieldType.BOOL}

    /**
     * @return {string} - a rendered example / representative data value to aid usability.
     */
    get example() {
        const {exampleValue} = this;
        if (exampleValue) return this.renderValue(exampleValue);
        if (this.isBoolFieldType) return 'true';
        if (this.isDateBasedFieldType) return 'YYYYMMDD';
        if (this.isNumericFieldType) return this.renderValue(1234);
        return 'value';
    }

    /**
     * @see FilterChooserFieldSpecConfig typedef for more details on these arguments -
     *      it documents the developer-facing API that will ultimately construct this class.
     * @param {Object} c - FieldSpec configuration.
     * @param {Field} c.field
     * @param {string} [c.displayName]
     * @param {string[]} [c.ops]
     * @param {boolean} [c.suggestValues]
     * @param {[]} [c.values]
     * @param {FilterOptionValueRendererCb} [c.valueRenderer]
     * @param {FilterOptionValueParserCb} [c.valueParser]
     * @param {*} [c.exampleValue]
     * @param {Record[]} storeRecords - latest Records from the associated store, used if applicable
     *      for extracting data values for autocomplete suggestions.
     */
    constructor({
        field,
        displayName,
        ops,
        suggestValues,
        values,
        valueRenderer,
        valueParser,
        exampleValue,
        storeRecords
    }) {
        this.field = field;
        this.displayName = displayName ?? field.displayName;
        this.ops = this.parseOperators(ops);

        // Enable value suggestion based on explicit config, filterType, or presence of values list.
        this.suggestValues = suggestValues ?? (this.isValueType || values);

        // Read values available for suggestion from direct config if provided, or extract from
        // Store Records if suggestions enabled.
        this.values = this.parseValues(values, storeRecords);

        this.valueRenderer = valueRenderer;
        this.valueParser = valueParser;
        this.exampleValue = exampleValue;

        Object.freeze(this);
    }

    renderValue(value, op) {
        let ret;
        if (isFunction(this.valueRenderer)) {
            ret = this.valueRenderer(value, op);
        } else if (this.isDateBasedFieldType) {
            ret = fmtDate(value);
        } else {
            ret = value?.toString();
        }
        return stripTags(ret);
    }

    parseValue(value, op) {
        const {fieldType} = this;

        if (isFunction(this.valueParser)) {
            return this.valueParser(value, op);
        }

        // Special handling for default localDate parsing to avoid throwing within parseFieldValue
        // when piping in special input values. Also supports user entering dash-separated dates,
        // which is likely given that we show resolved dates in that format.
        // TODO - consider a less-strict, more flexible version or flag for parseFieldValue.
        if (fieldType == FieldType.LOCAL_DATE) {
            value = value.replace(/-/g, '');
            return LocalDate.fmtRegEx.test(value) ? LocalDate.get(value) : null;
        } else {
            return parseFieldValue(value, fieldType);
        }
    }

    /**
     * @param {string} op
     * @return {boolean} - true if the provided op is supported by this spec.
     */
    supportsOperator(op) {
        return this.ops.includes(op);
    }


    //------------------------
    // Implementation
    //------------------------
    parseValues(values, storeRecords) {
        if (values) return values; // If explicit values provided by caller, return as-is
        if (this.suggestValues) {
            return this.isBoolFieldType ? [true, false] : this.extractValuesFromRecords(storeRecords);
        }
        return null;
    }

    parseOperators(ops) {
        ops = ops ?? this.getDefaultOperators();
        return ops.filter(it => FieldFilter.OPERATORS.includes(it));
    }

    getDefaultOperators() {
        if (this.isBoolFieldType) return ['='];
        return this.isValueType ? ['=', '!=', 'like'] : ['>', '>=', '<', '<=', '=', '!='];
    }

    extractValuesFromRecords(storeRecords) {
        const fieldName = this.field.name,
            values = new Set();

        storeRecords.forEach(rec => {
            const val = rec.get(fieldName);
            if (!isNil(val)) values.add(val);
        });

        return Array.from(values);
    }

}