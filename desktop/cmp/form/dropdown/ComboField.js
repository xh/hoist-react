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

import {BaseComboField} from './BaseComboField';

/**
 * ComboBox Field - A field with type ahead suggest and menu select
 */
@HoistComponent
export class ComboField extends BaseComboField {

    static propTypes = {
        ...BaseComboField.propTypes,

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
            {renderValue, internalOptions} = this;

        const displayValue = this.getDisplayValue(renderValue, internalOptions, '');

        // controlled active item is set through this components handler, or based on previously selected value
        // fallback to selecting first item to allow better user experience when adding options (!requireSelection)
        // TODO: Allow a null selection if query is no good and requireSelect == true
        const activeItem = this.activeItem || find(internalOptions, {value: this.externalValue}) || internalOptions[0];

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
export const comboField = elemFactory(ComboField);