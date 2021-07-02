/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistBase} from '@xh/hoist/core';
import {FieldFilter, FieldType, genDisplayName, parseFieldValue} from '@xh/hoist/data';
import {fmtDate} from '@xh/hoist/format';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {stripTags, throwIf} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';

/**
 * Defines field-level filtering options and provides metadata for presenting these options in
 * UI affordances such as FilterChooser to Grid Column Filters.
 *
 * @see FilterChooserFieldSpec
 * @see GridFilterFieldSpec
 */
export class BaseFieldSpec extends HoistBase {

    /** @member {string} */
    field;

    /** @return {FieldType} */
    fieldType;

    /** @member {string} */
    displayName;

    /** @member {string[]} */
    ops;

    /** @member {FieldSpecValueRendererCb} */
    valueRenderer;

    /** @member {FieldSpecValueParserCb} */
    valueParser;

    /** @member {(Store|View)} */
    source;

    /**
     * @param {Object} c - BaseFieldSpec configuration.
     * @param {string} c.field - identifying field name to filter on.
     * @param {Object} [c.fieldType] - type of field, will default from related field on source
     *      if provided, or 'auto'.
     * @param {string} [c.displayName] - displayName, will default from related field on source
     *      if provided.
     * @param {string[]} [c.ops] - operators available for filtering. Optional, will default to
     *      a supported set based on the fieldType.
     * @param {FieldSpecValueRendererCb} [c.valueRenderer] - function to produce a suitably
     *      formatted string for display to the user for any given field value.
     * @param {FieldSpecValueParserCb} [c.valueParser] - function to parse user's input from a
     *      filter chooser control into a typed data value for use in filtering comparisons.
     * @param {(Store|View)} [c.source] - Used to source matching data `Field` and extract
     *      values if configured.
     */
    constructor({
        field,
        fieldType,
        displayName,
        ops,
        valueRenderer,
        valueParser,
        source
    }) {
        super();
        this.field = field;
        this.source = source;

        const sourceField = this.sourceField;
        this.fieldType = fieldType ?? sourceField?.type ?? FieldType.AUTO;
        this.displayName = displayName ?? sourceField?.displayName ?? genDisplayName(field);
        this.ops = this.parseOperators(ops);
        this.valueRenderer = valueRenderer;
        this.valueParser = valueParser;

        throwIf(
            !this.valueParser && this.fieldType === FieldType.DATE,
            "Must provide an appropriate valueParser arg for fields with type 'date'"
        );
    }

    /**
     * @return {Field} - Full Field derived from source
     */
    get sourceField() {
        return this.source?.getField(this.field);
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
        return fieldType === FieldType.DATE || fieldType === FieldType.LOCAL_DATE;
    }

    get isNumericFieldType() {
        const {fieldType} = this;
        return fieldType === FieldType.INT || fieldType === FieldType.NUMBER;
    }

    get isBoolFieldType() {
        return this.fieldType === FieldType.BOOL;
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
            if (fieldType === FieldType.LOCAL_DATE) {
                return LocalDate.get(value.replace(/-/g, ''));
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

    //------------------------
    // Implementation
    //------------------------
    parseOperators(ops) {
        ops = ops ?? this.getDefaultOperators();
        return ops.filter(it => FieldFilter.OPERATORS.includes(it));
    }

    getDefaultOperators() {
        if (this.isBoolFieldType) return ['='];
        return this.isValueType ? ['=', '!=', 'like'] : ['>', '>=', '<', '<=', '=', '!='];
    }
}

/**
 * @callback FieldSpecValueRendererCb
 * @param {*} value
 * @param {string} op
 * @return {string} - formatted value suitable for display to the user.
 */

/**
 * @callback FieldSpecValueParserCb
 * @param {string} input
 * @param {string} op
 * @return {*} - the parsed value.
 */
