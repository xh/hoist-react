/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {find, isObject} from 'lodash';
import {observable, settable, action} from '@xh/hoist/mobx';
import {startsWith} from 'lodash';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Classes, suggest} from '@xh/hoist/kit/blueprint';
import {menuItem} from '@xh/hoist/kit/blueprint';
import {HoistInput} from '@xh/hoist/cmp/form';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * ComboBox - An input with type ahead suggest and menu select
 */
@HoistComponent
export class ComboBox extends HoistInput {
    
    static propTypes = {
        ...HoistInput.propTypes,

        /** true to commit on every key stroke, defaults false */
        commitOnChange: PT.bool,
        /** Text to display when control is empty */
        placeholder: PT.string,
        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string])),
        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        optionRenderer: PT.func,
        /** Whether to force values from given options. Set to true to disallow arbitrary input */
        requireSelection: PT.bool,
        /** Icon to display on the left side of the field */
        leftIcon: PT.element,
        /** Element to display on the right side of the field */
        rightElement: PT.element
    };

    baseClassName = 'xh-combo-box';

    @settable @observable query = '';
    @settable @observable.ref activeItem = null;
    @observable.ref internalOptions = [];

    constructor(props) {
        super(props);
        this.addAutorun(() => this.normalizeOptions(this.props.options));
    }

    get commitOnChange() {
        withDefault(this.props.commitOnChange, false);
    }

    render() {
        const {props, renderValue, internalOptions} = this,
            placeholder = withDefault(props.placeholder, 'Select'),
            displayValue = this.getDisplayValue(renderValue, internalOptions, placeholder);

        console.log(displayValue);
        return suggest({
            className: this.getClassName(),
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: internalOptions,
            onItemSelect: this.onItemSelect,
            itemPredicate: (q, item) => {
                return !q || startsWith(item.label.toLowerCase(), q.toLowerCase());
            },
            itemRenderer: this.itemRenderer,
            activeItem: this.activeItem,
            openOnKeyDown: true,
            onActiveItemChange: (it) => this.setActiveItem(it),
            inputValueRenderer: (s) => displayValue,
            query: this.query,
            onQueryChange: this.onChange,
            inputProps: {
                value: displayValue,
                onKeyPress: this.onKeyPress,
                onBlur: this.onBlur,
                onFocus: this.onFocus,
                autoComplete: 'nope',
                style: {...props.style, width: props.width},
                placeholder: placeholder,
                leftIcon: props.leftIcon,
                rightElement: props.rightElement
            },
            disabled: props.disabled
        });
    }

    //-----------------------------------------------------------
    // Common handling of options, rendering of selected option
    //-----------------------------------------------------------
    @action
    normalizeOptions(options) {
        options = withDefault(options, []);
        options = options.map(o => {
            const ret = isObject(o) ?
                {label: o.label, value: o.value} :
                {label: o != null ? o.toString() : '-null-', value: o};

            ret.value = this.toInternal(ret.value);
            return ret;
        });

        this.internalOptions = options;
    }

    getDisplayValue(value, items, placeholder) {
        const match = find(items, {value});

        if (match) return match.label;
        return value == null ? '' : value.toString();
    }


    //--------------------------------
    // Event handlers, callbacks
    //--------------------------------
    itemRenderer = (option, optionProps) => {
        return menuItem({
            key: option.value,
            text: option.label,
            onClick: optionProps.handleClick,
            active: optionProps.modifiers.active
        });
    }

    onItemSelect = (v) => {
        this.noteValueChange(v.value);
    }

    onChange = (val) => {
        this.setQuery(val);
        if (!this.props.requireSelection || this.isExactValue(val)) {
            console.log('accepting vale' + val)
            this.noteValueChange(val);
        }
    }

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') {
            this.doCommit();
        }
    }

    isExactValue(value) {
        return !!find(this.internalOptions, {value});
    }
}
export const comboBox = elemFactory(ComboBox);