/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {
    castArray,
    difference,
    escapeRegExp,
    first,
    isArray,
    isEmpty,
    isEqual,
    isNil,
    isString,
    isUndefined,
    uniq
} from 'lodash';
import {FieldType, parseFieldValue} from '../Field';
import {Store} from '../Store';
import {StoreRecord} from '../StoreRecord';
import {Filter} from './Filter';
import {FieldFilterOperator, FieldFilterSpec, FilterTestFn} from './Types';

/**
 * Filters by comparing the value of a given field to one or more given candidate values using one
 * of several supported operators.
 *
 * Note that the comparison operators `[<,<=,>,>=]` always return false for null/undefined values,
 * favoring the behavior of Excel over Javascript's implicit conversion of nullish values to 0.
 *
 * Immutable.
 */
export class FieldFilter extends Filter {
    get isFieldFilter() {
        return true;
    }

    readonly field: string;
    readonly op: FieldFilterOperator;
    readonly value: any;

    static OPERATORS = [
        '=',
        '!=',
        '>',
        '>=',
        '<',
        '<=',
        'like',
        'not like',
        'begins',
        'ends',
        'includes',
        'excludes'
    ];
    static ARRAY_OPERATORS = [
        '=',
        '!=',
        'like',
        'not like',
        'begins',
        'ends',
        'includes',
        'excludes'
    ];

    /**
     * Constructor - not typically called by apps - create via {@link parseFilter} instead.
     * @internal
     */
    constructor({field, op, value, valueType}: FieldFilterSpec) {
        super();

        throwIf(!field, 'FieldFilter requires a field');
        throwIf(isUndefined(value), 'FieldFilter requires a value');
        throwIf(
            !FieldFilter.OPERATORS.includes(op),
            `FieldFilter requires valid "op" value. Operator "${op}" not recognized.`
        );
        throwIf(
            !FieldFilter.ARRAY_OPERATORS.includes(op) && isArray(value),
            `Operator "${op}" does not support multiple values. Use a CompoundFilter instead.`
        );

        this.field = isString(field) ? field : field.name;
        this.op = op;
        this.value = isArray(value)
            ? uniq(value).map(it => (valueType ? parseFieldValue(it, valueType) : it))
            : valueType
              ? parseFieldValue(value, valueType)
              : value;

        Object.freeze(this);
    }

    toJSON() {
        const {field, op, value, serializedValueType} = this;
        return {field, op, value, ...(serializedValueType ? {valueType: serializedValueType} : {})};
    }

    //-----------------
    // Overrides
    //-----------------
    override getTestFn(store?: Store): FilterTestFn {
        let {field, op, value} = this,
            regExps;

        if (store) {
            const storeField = store.getField(field);
            if (!storeField) return () => true; // Ignore (do not filter out) if field not in store

            const fieldType = storeField.type === 'tags' ? 'string' : storeField.type;
            value = isArray(value)
                ? value.map(v => parseFieldValue(v, fieldType))
                : parseFieldValue(value, fieldType);
        }

        if (FieldFilter.ARRAY_OPERATORS.includes(op)) {
            value = castArray(value);
        }

        let opFn: (v: any) => boolean;
        switch (op) {
            case '=':
                opFn = v => {
                    if (isNil(v) || v === '' || (isArray(v) && isEmpty(v))) v = null;
                    return value.some(it => isEqual(v, it));
                };
                break;
            case '!=':
                opFn = v => {
                    if (isNil(v) || v === '' || (isArray(v) && isEmpty(v))) v = null;
                    return !value.some(it => isEqual(v, it));
                };
                break;
            case '>':
                opFn = v => !isNil(v) && v > value;
                break;
            case '>=':
                opFn = v => !isNil(v) && v >= value;
                break;
            case '<':
                opFn = v => !isNil(v) && v < value;
                break;
            case '<=':
                opFn = v => !isNil(v) && v <= value;
                break;
            case 'like':
                regExps = value.map(v => new RegExp(escapeRegExp(v), 'i'));
                opFn = v => regExps.some(re => re.test(v));
                break;
            case 'not like':
                regExps = value.map(v => new RegExp(escapeRegExp(v), 'i'));
                opFn = v => regExps.every(re => !re.test(v));
                break;
            case 'begins':
                regExps = value.map(v => new RegExp('^' + escapeRegExp(v), 'i'));
                opFn = v => regExps.some(re => re.test(v));
                break;
            case 'ends':
                regExps = value.map(v => new RegExp(escapeRegExp(v) + '$', 'i'));
                opFn = v => regExps.some(re => re.test(v));
                break;
            case 'includes':
                opFn = v => !isNil(v) && v.some(it => value.includes(it));
                break;
            case 'excludes':
                opFn = v => isNil(v) || !v.some(it => value.includes(it));
                break;
            default:
                throw XH.exception(`Unknown operator: ${op}`);
        }

        if (!store) return r => opFn(r[field]);

        return (r: StoreRecord) => {
            const val = r.get(field);
            if (opFn(val)) return true;

            // Maximize chances of matching. Always pass adds ...
            if (r.isAdd) return true;

            // ... and check any differing original value as well
            const committedVal = r.committedData[field];
            return committedVal !== val && opFn(committedVal);
        };
    }

    override equals(other: Filter): boolean {
        if (other === this) return true;
        return (
            other instanceof FieldFilter &&
            other.field === this.field &&
            other.op === this.op &&
            (isArray(other.value) && isArray(this.value)
                ? other.value.length === this.value.length &&
                  difference(other.value, this.value).length === 0
                : other.value === this.value)
        );
    }

    //-----------------
    // Implementation
    //-----------------
    private get serializedValueType(): FieldType {
        const value = isArray(this.value) ? first(this.value) : this.value;
        if (value instanceof Date) return 'date';
        if (value instanceof LocalDate) return 'localDate';
        return undefined;
    }
}
