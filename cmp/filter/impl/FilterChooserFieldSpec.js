/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {FieldFilter, FieldType, parseFieldValue} from '@xh/hoist/data';
import {fmtDate} from '@xh/hoist/format';
import {stripTags, withDefault} from '@xh/hoist/utils/js';
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
export class FilterChooserFieldSpec {

    /** @member {Field} */
    field;

    /** @member {string} */
    displayName;

    /** @member {string[]} */
    operators;

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

    /**
     * @return {string} - a rendered example / representative data value to aid usability.
     *      TODO - default return of upper fieldType is a bit rough (e.g. "INT")
     */
    get example() {
        const {exampleValue, fieldType} = this;
        return exampleValue ? this.renderValue(exampleValue) : fieldType.toUpperCase();
    }

    /**
     * @see FilterChooserFieldSpecConfig typedef for more details on these arguments -
     *      it documents the developer-facing API that will ultimately construct this class.
     * @param {Object} c - FilterChooserFieldSpec configuration.
     * @param {Field} c.field
     * @param {string} [c.displayName]
     * @param {string[]} [c.operators]
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
        operators,
        suggestValues,
        values,
        valueRenderer,
        valueParser,
        exampleValue,
        storeRecords
    }) {
        this.field = field;
        this.displayName = displayName ?? field.displayName;
        this.operators = this.parseOperators(operators);

        // Enable value suggestion based on explicit config, filterType, or presence of values list.
        this.suggestValues = withDefault(suggestValues, this.filterType == 'value' || values);

        // Read values available for suggestion from direct config if provided, or extract from
        // Store Records if suggestions enabled.
        this.values = values ?? (this.suggestValues ? this.extractValuesFromRecords(storeRecords) : null);

        this.valueRenderer = valueRenderer;
        this.valueParser = valueParser;
        this.exampleValue = exampleValue;

        Object.freeze(this);
    }

    renderValue(value, operator) {
        let ret;
        if (this.valueRenderer) {
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

    /**
     * @param {string} operator
     * @return {boolean} - true if the provided operator is supported by this spec.
     */
    supportsOperator(operator) {return this.operators.includes(operator)}


    //------------------------
    // Implementation
    //------------------------
    parseOperators(operators) {
        return operators ?
            operators.filter(it => FieldFilter.isValidOperator(it)) :
            this.filterType === 'value' ? ['=', '!=', 'like'] : ['>', '>=', '<', '<=', '=', '!='];
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