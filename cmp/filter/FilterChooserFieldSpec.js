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
import {stripTags} from '@xh/hoist/utils/js';
import {isFunction, isNil} from 'lodash';

/**
 * Defines the filters options available for a given field and provides useful metadata
 * for including these options in UI affordances, including available data values for suggestion
 * if applicable / so configured.
 *
 * Apps should NOT instantiate this class directly. Instead {@see FilterChooserModel.fieldSpecs}
 * for the relevant config to set these options.
 */
@ReactiveSupport
export class FilterChooserFieldSpec {

    /** @member {String} */
    field;

    /** @member {string} */
    displayName;

    /** @member {string[]} */
    ops;

    /** @member {boolean} */
    suggestValues;

    /** @member {?Array} - data values available for suggestion*/
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
     *      if store provided, or 'AUTO'.
     * @param {string} [c.displayName] - displayName, will default from related store field,
     *      if store provided.
     * @property {string[]} [ops] - operators available for filtering. Optional, will default to
     *      a supported set based on the fieldType.
     * @property {boolean} [suggestValues] - true to provide auto-complete options with data
     *      values sourced either automatically from Store data or as provided directly via the
     *      `values` config below. Default `true` when supported based on the fieldType.
     *      Set to `false` to disable extraction/suggestion of values from Store.
     * @property {[]} [values] - explicit list of available values to autocomplete for this field.
     *      Optional, will otherwise be extracted and updated from available Store data if applicable.
     * @property {FilterOptionValueRendererCb} [valueRenderer] - function to produce a suitably
     *      formatted string for display to the user for any given field value.
     * @property {FilterOptionValueParserCb} [valueParser] - function to parse user's input from a
     *      filter chooser control into a typed data value suitable for use in filtering comparisons.
     * @property {*} [exampleValue] - sample / representative value used by components to aid usability.
     * @param {Store} [store] - store.  If provided and has a Field object matching the field
     *      name on this object, that Field will be used for various defaults and lookup
     *      values for this object.
     */
    constructor({
        field,
        fieldType,
        displayName,
        ops,
        suggestValues,
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

        // Enable value suggestion based on explicit config, filterType, or presence of values list.
        this.suggestValues = !!(suggestValues ?? (this.isValueType || values));


        // Read values available for suggestion from direct config if provided or store
        this.loadValues(values);

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
    loadValues(values) {
        if (values) {
            this.values = values;
            return;
        }

        if (this.suggestValues) {
            if (this.isBoolFieldType) {
                this.values = [true, false];
            } else if (this.store && this.storeField) {
                this.addReaction({
                    track: () => this.store.lastUpdated,
                    run: () => this.loadValuesFromStore(),
                    fireImmediately: true
                });
            }
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