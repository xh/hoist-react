/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {isObject, find} from 'lodash';
import {menuItem} from 'hoist/kit/blueprint';

import {HoistField} from '../HoistField';

/**
 * BaseDropdownField
 *
 * Abstract class supporting BaseComboField and SelectField.
 */
export class BaseDropdownField extends HoistField {

    static propTypes = {
        /** Text to display when control is empty */
        placeholder: PT.string
    };

    static defaultProps = {
        placeholder: 'Select'
    }

    //---------------------------------------------------------------------------
    // Handling of null values.  Blueprint doesn't allow null for the value of a
    // dropdown control, but we can use a sentinel value to represent it.
    //----------------------------------------------------------------------------
    toExternal(internal) {
        return internal === NULL_VALUE ? null : internal;
    }

    toInternal(external) {
        return external ===  null ? NULL_VALUE : external;
    }

    getDisplayValue(value, items, placeholder) {
        const match = find(items, {value});

        if (match) return match.label;
        return (value == null || value === NULL_VALUE) ? placeholder : value.toString();
    }

    onItemSelect = (val) => {
        this.noteValueChange(val.value);
        this.doCommit();
    }
}

const NULL_VALUE = 'xhNullValue';