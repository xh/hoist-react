/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {find} from 'lodash';
import {observable, action} from '@xh/hoist/mobx';
import {startsWith} from 'lodash';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Classes, suggest} from '@xh/hoist/kit/blueprint';

import {BaseComboBox} from './BaseComboBox';

/**
 * ComboBox - An input with type ahead suggest and menu select
 */
@HoistComponent
export class ComboBox extends BaseComboBox {

    static propTypes = {
        ...BaseComboBox.propTypes,

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

    delegateProps = ['className', 'disabled', 'placeholder', 'leftIcon', 'rightElement'];

    baseClassName = 'xh-combo-field';

    @observable.ref activeItem = null;

    constructor(props) {
        super(props);
        this.addAutorun(() => this.normalizeOptions(this.props.options));
    }
    
    render() {
        const {style, width, disabled} = this.props,
            {renderValue, internalOptions} = this,
            displayValue = this.getDisplayValue(renderValue, internalOptions, ''),
            activeItem = this.getActiveItem();

        return suggest({
            className: this.getClassName(),
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: internalOptions,
            onItemSelect: this.onItemSelect,
            itemPredicate: (q, item) => {
                return startsWith(item.label.toLowerCase(), q.toLowerCase());
            },
            itemRenderer: this.getOptionRenderer(),
            activeItem,
            onActiveItemChange: this.setActiveItem,
            inputValueRenderer: selectedItem => displayValue,
            query: displayValue,
            onQueryChange: this.onChange,
            inputProps: {
                onKeyPress: this.onKeyPress,
                onBlur: this.onBlur,
                onFocus: this.onFocus,
                autoComplete: 'nope',
                style: {...style, width},
                ...this.getDelegateProps()
            },
            disabled
        });
    }

    @action
    setActiveItem = (item) => {
        this.activeItem = item;
    }

    getActiveItem() {
        const {internalOptions} = this;
        // controlled active item will be set through this component's handler, or based on the previously selected value
        // fallbacks to first option to allow better user experience when adding options (!requireSelection)
        return this.activeItem || find(internalOptions, {value: this.externalValue}) || internalOptions[0];
    }

    onItemSelect = (val) => {
        // If this control requires selection and given invalid input, reset to previous value
        const invalidInput = this.props.requireSelection && !startsWith(val.label.toLowerCase(), this.internalValue.toLowerCase()),
            newValue = invalidInput ? this.externalValue : val.value;

        this.noteValueChange(newValue);
        this.doDebouncedCommit();
    }

    onChange = (string) => {
        if (!this.props.requireSelection) this.normalizeOptions(this.props.options, string);
        this.noteValueChange(string);
    }

    onBlur = () => {
        this.noteBlurred();
    }

    onFocus = () => {
        this.noteFocused();
    }

}
export const comboBox = elemFactory(ComboBox);