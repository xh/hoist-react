/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {isObject, find} from 'lodash';
import {observable, action} from '@xh/hoist/mobx';
import {menuItem} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistField} from '@xh/hoist/cmp/form';

/**
 * BaseDropdownField
 *
 * Abstract class supporting BaseComboField and SelectField.
 */
export class BaseDropdownField extends HoistField {

    static propTypes = {
        ...HoistField.propTypes,

        /** Text to display when control is empty */
        placeholder: PT.string
    };

    static defaultProps = {
        placeholder: 'Select',
        commitOnChange: false
    };

    // blueprint-ready collection of available options, normalized to {label, value} form.
    @observable.ref internalOptions = [];

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


    //-----------------------------------------------------------
    // Common handling of options, rendering of selected option
    //-----------------------------------------------------------
    @action
    normalizeOptions(options, additionalOption) {
        options = withDefault(options, []);
        options = options.map(o => {
            const ret = isObject(o) ?
                {label: o.label, value: o.value} :
                {label: o != null ? o.toString() : '-null-', value: o};

            ret.value = this.toInternal(ret.value);
            return ret;
        });

        if (additionalOption && !find(options, (it) => it.value == additionalOption || it.label == additionalOption)) {
            options.unshift({value: additionalOption, label: additionalOption});
        }

        this.internalOptions = options;
    }

    getOptionRenderer() {
        return this.props.optionRenderer || this.defaultOptionRenderer;
    }

    defaultOptionRenderer(option, optionProps) {
        return menuItem({
            key: option.value,
            text: option.label,
            onClick: optionProps.handleClick,
            active: optionProps.modifiers.active
        });
    }

    getDisplayValue(value, items, placeholder) {
        const match = find(items, {value});

        if (match) return match.label;
        return (value == null || value === NULL_VALUE) ? placeholder : value.toString();
    }

    onItemSelect = (val) => {
        console.log('onItemSelect', val);
        this.noteValueChange(val.value);
        if (!this.props.commitOnChange) this.doCommit();
    }
}

const NULL_VALUE = 'xhNullValue';