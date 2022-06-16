/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistBase} from '@xh/hoist/core';
import {FieldFilter, FieldType, genDisplayName} from '@xh/hoist/data';
import {isEmpty} from 'lodash';

/**
 * Defines field-level filtering options and provides metadata for presenting these options in
 * UI affordances such as FilterChooser to Grid Column Filters.
 *
 * @see FilterChooserFieldSpec
 * @see GridFilterFieldSpec
 *
 * @abstract
 */
export class BaseFilterFieldSpec extends HoistBase {

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

    /** @member {boolean} */
    enableValues;

    /** @member {boolean} */
    forceSelection;

    /** @member {?Array} */
    values;

    /**
     * @param {Object} c - BaseFilterFieldSpec configuration.
     * @param {string} c.field - identifying field name to filter on.
     * @param {Object} [c.fieldType] - type of field, will default from related field on source
     *      if provided, or 'auto'.
     * @param {string} [c.displayName] - displayName, will default from related field on source
     *      if provided.
     * @param {string[]} [c.ops] - operators available for filtering. Optional, will default to
     *      a supported set based on the fieldType.
     * @param {(Store|View)} [c.source] - Used to source matching data `Field` and extract
     *      values if configured.
     * @param {boolean} [c.enableValues] - true to provide interfaces and auto-complete options
     *      with enumerated matches for creating '=' or '!=' filters. Defaults to true for
     *      enumerable fieldTypes.
     * @param {boolean} [c.forceSelection] - true to require value entered to be an available value
     *      for '=' and '!=' operators. Defaults to false.
     * @param {*[]} [c.values] - explicit list of available values for this field.
     */
    constructor({
        field,
        fieldType,
        displayName,
        ops,
        source,
        enableValues,
        forceSelection,
        values
    }) {
        super();
        this.field = field;
        this.source = source;

        const sourceField = this.sourceField;
        this.fieldType = fieldType ?? sourceField?.type ?? FieldType.AUTO;
        this.displayName = displayName ?? sourceField?.displayName ?? genDisplayName(field);
        this.ops = this.parseOperators(ops);
        this.enableValues = enableValues ?? this.isEnumerableByDefault;
        this.forceSelection = forceSelection ?? false;
        this.values = values ?? (this.isBoolFieldType ? [true, false] : null);
        this.hasExplicitValues = !isEmpty(this.values);
    }

    /**
     * @return {Field} - Full Field derived from source
     */
    get sourceField() {
        return this.source?.getField(this.field);
    }

    /**
     * @return {string} - 'range', 'value', or 'collection' - determines operations supported by this field.
     *      Type 'range' indicates the field should use mathematical / logical operations
     *      ('>', '>=', '<', '<=', '=', '!='). Type 'value' indicates the field should use equality
     *      operators ('=', '!=', 'like', 'not like', 'begins', 'ends') against a suggested
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
            case FT.TAGS:
                return 'collection';
            default:
                return 'value';
        }
    }

    get isRangeType() { return this.filterType === 'range' }
    get isValueType() { return this.filterType === 'value' }
    get isCollectionType() { return this.filterType === 'collection' }

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

    loadValues() {
        if (!this.hasExplicitValues && this.enableValues) {
            this.loadValuesFromSource();
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
            this.enableValues &&
            this.supportsOperator(op) &&
            (op === '=' || op === '!=' || op === 'includes' || op === 'excludes');
    }

    //------------------------
    // Abstract
    //------------------------
    loadValuesFromSource() {}

    //------------------------
    // Implementation
    //------------------------
    parseOperators(ops) {
        ops = ops ?? this.getDefaultOperators();
        return ops.filter(it => FieldFilter.OPERATORS.includes(it));
    }

    getDefaultOperators() {
        if (this.isBoolFieldType) return ['='];
        if (this.isCollectionType) return ['includes', 'excludes'];
        return this.isValueType ?
            ['=', '!=', 'like', 'not like', 'begins', 'ends'] :
            ['>', '>=', '<', '<=', '=', '!='];
    }

    get isEnumerableByDefault() {
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
}
