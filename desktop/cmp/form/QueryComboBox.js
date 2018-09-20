/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {observable, settable, action} from '@xh/hoist/mobx';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Classes, suggest} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/form';
import {menuItem} from '@xh/hoist/kit/blueprint';
import {isObject, find} from 'lodash';


/**
 * ComboBox which populates its options dynamically based on the current value.
 */
@HoistComponent
export class QueryComboBox extends HoistInput {
    
    static propTypes = {
        ...HoistInput.propTypes,

        /**
         * Function to be run when value of control changes to repopulate the available items.
         * Should return a promise resolving to a collection of form:
         *      [{value: string, label: string}, ...]
         * or
         *      [val, val, ...]
         */
        queryFn: PT.func,
        /** Delay (in ms) used to buffer calls to the queryFn (default 100) */
        queryBuffer: PT.number,
        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        optionRenderer: PT.func,
        /** Whether to force values from given options. Set to true to disallow arbitrary input */
        requireSelection: PT.bool,
        /** Icon to display on the left side of the field */
        leftIcon: PT.element,
        /** Element to display on the right side of the field */
        rightElement: PT.element
    };

    delegateProps = ['className', 'style', 'placeholder', 'disabled', 'leftIcon', 'rightElement'];

    baseClassName = 'xh-query-combo-box';

    @settable @observable.ref activeItem = null;
    @observable.ref internalOptions = [];


    constructor(props) {
        super(props);
        this.addAutorun({
            run: this.syncOptions,
            delay: props.queryBuffer || 100
        });
        this.addAutorun(() => {
            this.setActiveItem(find(this.internalOptions, {value: this.renderValue}) || null);
        });
    }

    render() {
        const {renderValue, internalOptions, props} = this,
            displayValue = this.getDisplayValue(renderValue, internalOptions, ''),
            placeholder = withDefault(props.placeholder, 'Select');

        return suggest({
            className: this.getClassName(),
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: internalOptions,
            onItemSelect: this.onItemSelect,
            itemRenderer: this.itemRenderer,
            activeItem: this.activeItem,
            onActiveItemChange: (it) => this.setActiveItem(it),
            inputValueRenderer: () => displayValue,
            query: displayValue,
            onQueryChange: this.onQueryChange,
            inputProps: {
                value: this.getDisplayValue(renderValue, internalOptions, ''),
                onKeyPress: this.onKeyPress,
                onFocus: this.onFocus,
                onBlur: this.onBlur,
                autoComplete: 'nope',
                style: {...props.style, width: props.width},
                leftIcon: props.leftIcon,
                rightElement: props.rightElement,
                placeholder
            },
            disabled: props.disabled
        });
    }

    //-----------------------------------------------------------
    // Common handling of options, rendering of selected option
    //-----------------------------------------------------------
    syncOptions() {
        const value = this.internalValue,
            {queryFn} = this.props;

        if (queryFn) {
            queryFn(value).then(options => {
                this.normalizeOptions(options);
            });
        }
    }

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

    //--------------------
    // Handlers
    //--------------------
    itemRenderer = (option, optionProps) => {
        return menuItem({
            key: option.value,
            text: option.label,
            onClick: optionProps.handleClick,
            active: optionProps.modifiers.active
        });
    }
}
export const queryComboBox = elemFactory(QueryComboBox);