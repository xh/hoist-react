/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {ReactiveSupport} from '@xh/hoist/core';
import {FieldFilter, FieldType, parseFieldValue, genDisplayName} from '@xh/hoist/data';
import {fmtDate} from '@xh/hoist/format';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {stripTags, throwIf} from '@xh/hoist/utils/js';
import {isFunction, isNil} from 'lodash';

/**
 * Defines field-level filtering options and provides metadata for presenting these options in
 * UI affordances, including data values available for suggestion if applicable and configured.
 *
 * Apps should NOT instantiate this class directly. Instead {@see FilterChooserModel.fieldSpecs}
 * for the relevant config to set these options.
 */
@ReactiveSupport
export class FilterChooserFieldSpec {

    /** @member {string} */
    field;

    /** @member {string} */
    displayName;

    /** @member {string[]} */
    ops;

    /** @member {(boolean | FilterOptionValuesSuggestValuesCb)} */
    suggestValues;

    /** @member {boolean} */
    forceSelection;

    /** @member {?Array} - data values available for suggestion. */
    values;

    /** @member {FilterOptionValueRendererCb} */
    valueRenderer;

    /** @member {FilterOptionValueParserCb} */
    valueParser;

    /** @member {*} */
    exampleValue;

    /** @return {FieldType} */
    fieldType;

    /**
     * @param {Object} c - FilterChooserFieldSpec configuration.
     * @param {String} c.field - identifying field name to filter on.
     * @param {Object} [c.fieldType] - type of field, will default from related store field,
     *      if store provided, or 'auto'.
     * @param {string} [c.displayName] - displayName, will default from related store field,
     *      if store provided.
     * @param {string[]} [ops] - operators available for filtering. Optional, will default to
     *      a supported set based on the fieldType.
     * @param {*[]} [values] - explicit list of available values for this field.
     * @param {(boolean|FilterOptionSuggestValuesCb)} [suggestValues] - true to provide
     *      auto-complete options with enumerated matches when user specifies '=', or'!='.
     *      Defaults to true for fieldTypes of 'string' or 'auto', Otherwise false.  May be also
     *      specified as the function to be used for the matching.  (If true a default "word start"
     *      matching against the formatted value will be used.)
     * @param {boolean} [forceSelection] - true to require value entered to be an available value
     *      for '=' and '!=' operators.  Defaults to false.
     * @param {FilterOptionValueRendererCb} [valueRenderer] - function to produce a suitably
     *      formatted string for display to the user for any given field value.
     * @param {FilterOptionValueParserCb} [valueParser] - function to parse user's input from a
     *      filter chooser control into a typed data value for use in filtering comparisons.
     * @param {*} [exampleValue] - sample / representative value displayed by `FilterChooser`
     *      components to aid usability.
     * @param {Store} [store] - set from controlling `FilterChooserModel.sourceStore` config, used
     *      to source matching data `Field` and extract values if configured.
     */
    constructor({
        field,
        fieldType,
        displayName,
        ops,
        suggestValues,
        forceSelection,
        values,
        valueRenderer,
        valueParser,
        exampleValue,
        store
    }) {
        this.field = field;
        this.store = store;

        const storeField = store?.getField(field);
        this.storeField = storeField;
        this.fieldType = fieldType ?? storeField?.type ?? FieldType.AUTO;

        this.displayName = displayName ?? storeField?.displayName ?? genDisplayName(field);
        this.ops = this.parseOperators(ops);

        this.suggestValues = suggestValues ?? this.isValueType;
        this.forceSelection = forceSelection ?? false;

        this.loadValues(values);

        throwIf(
            !this.values && forceSelection,
            `Must provide lookup values for field '${field}', or set forceSelection to false.`
        );

        this.valueRenderer = valueRenderer;
        this.valueParser = valueParser;
        this.exampleValue = exampleValue;
    }

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

    get isRangeType() { return this.filterType === 'range' }
    get isValueType() { return this.filterType === 'value' }

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
        try {
            const {fieldType} = this;

            if (isFunction(this.valueParser)) {
                return this.valueParser(value, op);
            }

            // Special handling for default localDate to supports user entering dash-separated dates,
            // which is likely given that we show resolved dates in that format.
            // TODO - consider a less-strict, more flexible version or flag for parseFieldValue.
            if (fieldType == FieldType.LOCAL_DATE) {
                value = value.replace(/-/g, '');
                return LocalDate.fmtRegEx.test(value) ? LocalDate.get(value) : null;
            }

            return parseFieldValue(value, fieldType, undefined);

        } catch (e) {
            return undefined;
        }
    }

    /**
     * @param {string} op
     * @return {boolean}
     */
    supportsOperator(op) {
        return this.ops.includes(op);
    }

    /**
     * @param {string} op
     * @returns {boolean}
     */
    supportsSuggestions(op) {
        return this.values &&
            this.suggestValues &&
            this.supportsOperator(op) &&
            (op === '=' || op === '!=');
    }

    //------------------------
    // Implementation
    //------------------------
    loadValues(values) {
        if (values) {
            this.values = values;
            return;
        }

        if (this.isBoolFieldType) {
            this.values = [true, false];
            return;
        }

        if (this.store && this.storeField && (this.suggestValues || this.forceSelection)) {
            this.addReaction({
                track: () => this.store.lastUpdated,
                run: () => this.loadValuesFromStore(),
                fireImmediately: true
            });
            return;
        }
    }

    parseOperators(ops) {
        ops = ops ?? this.getDefaultOperators();
        return ops.filter(it => FieldFilter.OPERATORS.includes(it));
    }

    getDefaultOperators() {
        if (this.isBoolFieldType) return ['='];
        return this.isValueType ? ['=', '!=', 'like'] : ['>', '>=', '<', '<=', '=', '!='];
    }

    loadValuesFromStore() {
        const {field, store} = this,
            values = new Set();

        store.records.forEach(rec => {
            const val = rec.get(field);
            if (!isNil(val)) values.add(val);
        });

        this.values = Array.from(values);
    }
}

/**
 * @callback FilterOptionSuggestValuesCb - a function to be run against all values returned by
 *      the fieldSpecs values getter to determine if they should be considered suggestions.
 * @param {string} query - raw user query
 * @param {*} parsedQuery - parsed user query (or undefined, if parsing failed)
 * @return {function} - a test function taking a formatted value and value, and
 *      returning a boolean, if the value should be considered a match for query.
 */

/**
 * @callback FilterOptionValueRendererCb
 * @param {*} value
 * @param {string} op
 * @return {string} - formatted value suitable for display to the user.
 */

/**
 * @callback FilterOptionValueParserCb
 * @param {string} input
 * @param {string} op
 * @return {*} - the parsed value.
 */
