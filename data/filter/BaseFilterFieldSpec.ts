/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistBase} from '@xh/hoist/core';
import {Field, Store, FieldFilter, FieldType, genDisplayName, View} from '@xh/hoist/data';
import {isEmpty} from 'lodash';
import {FieldFilterOperator} from './Types';

/**
 * Defines field-level filtering options and provides metadata for presenting these options in
 * UI affordances such as FilterChooser to Grid Column Filters.
 *
 * @see FilterChooserFieldSpec
 * @see GridFilterFieldSpec
 *
 * @abstract
 */
export abstract class BaseFilterFieldSpec extends HoistBase {

    /** Identifying field name to filter on. */
    field: string;

    /** Type of field, will default from related field on source if provided, or 'auto'. */
    fieldType: FieldType;

    /** DisplayName, will default from related field on source if provided */
    displayName: string;

    /** Operators available for filtering, will default to a supported set based on type.*/
    ops: FieldFilterOperator[];

    /** Used to source matching data `Field` and extract values if configured. */
    source: Store|View;

    /**
     * True to provide interfaces and auto-complete options
     * with enumerated matches for creating '=' or '!=' filters. Defaults to true for
     * enumerable fieldTypes. Always true if 'values' provided or if fieldType is BOOL.
     */
    enableValues: boolean;

    /**
     *  True to require value entered to be an available value for '=' and '!=' operators.
     *  Defaults to false.
     */
    forceSelection: boolean;

    /** Explicit list of available values for this field. */
    values: any[];

    hasExplicitValues: boolean;

    constructor({
        field,
        fieldType,
        displayName,
        ops,
        source,
        enableValues,
        forceSelection,
        values
    }: Partial<BaseFilterFieldSpec>) {
        super();
        this.field = field;
        this.source = source;

        const sourceField = this.sourceField;
        this.fieldType = fieldType ?? sourceField?.type ?? FieldType.AUTO;
        this.displayName = displayName ?? sourceField?.displayName ?? genDisplayName(field);
        this.ops = this.parseOperators(ops);
        this.forceSelection = forceSelection ?? false;
        this.values = values ?? (this.isBoolFieldType ? [true, false] : null);
        this.hasExplicitValues = !isEmpty(this.values);
        this.enableValues = this.hasExplicitValues || (enableValues ?? this.isEnumerableByDefault);
    }

    /** Full Field derived from source. */
    get sourceField(): Field {
        return this.source?.getField(this.field);
    }

    /**
     * Determines operations supported by this field.
     *
     * Type 'range' indicates the field should use mathematical / logical operations
     * ('>', '>=', '<', '<=', '=', '!=').
     *
     * Type 'value' indicates the field should use equality operators
     * ('=', '!=', 'like', 'not like', 'begins', 'ends') against a suggested exact value or
     * user-provided input.
     */
    get filterType(): 'range'|'value'|'collection' {
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

    get isRangeType(): boolean { return this.filterType === 'range' }
    get isValueType(): boolean { return this.filterType === 'value' }
    get isCollectionType(): boolean { return this.filterType === 'collection' }

    get isDateBasedFieldType(): boolean {
        const {fieldType} = this;
        return fieldType === FieldType.DATE || fieldType === FieldType.LOCAL_DATE;
    }

    get isNumericFieldType(): boolean {
        const {fieldType} = this;
        return fieldType === FieldType.INT || fieldType === FieldType.NUMBER;
    }

    get isBoolFieldType(): boolean {
        return this.fieldType === FieldType.BOOL;
    }

    loadValues() {
        if (!this.hasExplicitValues && this.enableValues) {
            this.loadValuesFromSource();
        }
    }

    supportsOperator(op: FieldFilterOperator): boolean {
        return this.ops.includes(op);
    }

    supportsSuggestions(op: FieldFilterOperator): boolean {
        return this.values &&
            this.enableValues &&
            this.supportsOperator(op) &&
            (op === '=' || op === '!=' || op === 'includes' || op === 'excludes');
    }

    //------------------------
    // Abstract
    //------------------------
    abstract loadValuesFromSource();

    //------------------------
    // Implementation
    //------------------------
    private parseOperators(ops: any): FieldFilterOperator[] {
        ops = ops ?? this.getDefaultOperators();
        return ops.filter(it => FieldFilter.OPERATORS.includes(it));
    }

    private getDefaultOperators(): FieldFilterOperator[] {
        if (this.isBoolFieldType) return ['='];
        if (this.isCollectionType) return ['includes', 'excludes'];
        return this.isValueType ?
            ['=', '!=', 'like', 'not like', 'begins', 'ends'] :
            ['>', '>=', '<', '<=', '=', '!='];
    }

    private get isEnumerableByDefault(): boolean {
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