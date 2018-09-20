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

    @settable @observable.ref activeItem = null;
    @observable.ref internalOptions = [];

    constructor(props) {
        super(props);
        this.addAutorun(() => this.normalizeOptions(this.props.options));
        this.addAutorun(() => {
            this.setActiveItem(find(this.internalOptions, {value: this.renderValue}) || null);
        });
    }
    
    render() {
        const {props, renderValue, internalOptions} = this,
            displayValue = this.getDisplayValue(renderValue, internalOptions, ''),
            placeholder = withDefault(props.placeholder, 'Select');

        return suggest({
            className: this.getClassName(),
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: internalOptions,
            onItemSelect: this.onItemSelect,
            itemPredicate: (q, item) => {
                return startsWith(item.label.toLowerCase(), q.toLowerCase());
            },
            itemRenderer: this.itemRenderer,
            activeItem: this.activeItem,
            onActiveItemChange: (it) => this.setActiveItem(it),
            inputValueRenderer: () => displayValue,
            query: displayValue,
            onQueryChange: this.onQueryChange,
            inputProps: {
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
        return value == null ? placeholder : value.toString();
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

    onQueryChange = (q) => {
        console.log(q);
    }

    onKeyPress = (ev) => {
        if (ev.key === 'Enter' && !this.props.requireSelection) {
            this.noteValueChange();
        }
    }

}
export const comboBox = elemFactory(ComboBox);