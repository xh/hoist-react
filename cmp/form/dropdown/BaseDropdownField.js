/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isObject, find} from 'lodash';
import {menuItem} from 'hoist/kit/blueprint';

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

    get itemRenderer() {
        const {itemRenderer} = this.props;
        return itemRenderer || this.defaultItemRenderer;
    }

    //---------------------------------------------------------------------------
    // Handling of null values.  Blueprint doesn't allow null for the value of a
    // dropdown control, but we can use a sentinel value to represent it.
    //----------------------------------------------------------------------------
    toExternal(internal) {
        return internal === NULL_VALUE ? null : internal;
    }

    toInternal(external) {
        return external ===  null ?  NULL_VALUE : external;
    }


    //-----------------------------------------------------------
    // Common handling of options, rendering of selected option
    //-----------------------------------------------------------
    normalizeOptions(options) {
        return options.map(o => {
            const ret = isObject(o) ?
                {label: o.label, value: o.value} :
                {label: o != null ? o.toString() : '-null-', value: o};

            ret.value = this.toInternal(ret.value);
            return ret;
        });
    }

    defaultItemRenderer(item, itemProps) {
        return menuItem({
            key: item.value,
            text: item.label,
            onClick: itemProps.handleClick,
            active: itemProps.modifiers.active
        });
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