/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isObject, find} from 'lodash';

import {HoistField} from '../HoistField';

/**
 * BaseDropdownField
 *
 * Abstract class supporting ComboField and SelectField.
 */
export class BaseDropdownField extends HoistField {

    static defaultProps = {
        placeholder: 'Select'
    }

    delegateProps = ['className', 'disabled', 'placeholder'];

    onItemSelect = (val) => {
        this.noteValueChange(val.value);
        this.doCommit();
    }

    getDisplayValue(value, items, placeholder) {
        const match = find(items, {value});

        if (match) return match.label;
        return (value == null || value === NULL_VALUE) ? placeholder : value.toString();
    }

    toExternal(internal) {
        return internal === NULL_VALUE ? null : internal;
    }

    toInternal(external) {
        return external ===  null ?  NULL_VALUE : external;
    }

    normalizeOptions(options) {
        return options.map(o => {
            const ret = isObject(o) ?
                {label: o.label, value: o.value} :
                {label: o != null ? o.toString() : '-', value: o}

            ret.value = this.toInternal(ret.value);
            return ret;
        });
    }
}

const NULL_VALUE = 'xhNullValue';