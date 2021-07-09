/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistBase} from '@xh/hoist/core';
import {FieldFilter, FieldType, genDisplayName} from '@xh/hoist/data';

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
     * @param {(Store|View)} [c.source] - Used to source matching data `Field` and extract
     *      values if configured.
     */
    constructor({
        field,
        fieldType,
        displayName,
        ops,
        source
    }) {
        super();
        this.field = field;
        this.source = source;

        const sourceField = this.sourceField;
        this.fieldType = fieldType ?? sourceField?.type ?? FieldType.AUTO;
        this.displayName = displayName ?? sourceField?.displayName ?? genDisplayName(field);
        this.ops = this.parseOperators(ops);
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
     *      operators ('=', '!=', 'like', 'not like', 'begins with', 'ends with') against a suggested
     *      exact value or user-provided input.
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

    /**
     * @return {boolean} - determines whether values should be enumerated in UI affordances.
     */
    get isEnumerable() {
        const FT = FieldType;
        switch (this.fieldType) {
            case FT.INT:
            case FT.NUMBER:
            case FT.DATE:
                return false;
            default:
                return true;
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
        return this.isValueType ?
            ['=', '!=', 'like', 'not like', 'begins with', 'ends with'] :
            ['>', '>=', '<', '<=', '=', '!='];
    }
}
