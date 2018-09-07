/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
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

    constructor(props) {
        super(props);
        this.addAutorun(() => this.normalizeOptions(this.props.options));
    }
    
    render() {
        const {style, width, disabled} = this.props,
            {renderValue, internalOptions} = this;

        return suggest({
            className: this.getClassName(),
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: internalOptions,
            onItemSelect: this.onItemSelect,
            itemPredicate: (q, item) => {
                return startsWith(item.label.toLowerCase(), q.toLowerCase());
            },
            itemRenderer: this.getOptionRenderer(),
            inputValueRenderer: s => s,
            inputProps: {
                value: this.getDisplayValue(renderValue, internalOptions, ''),
                onChange: this.onChange,
                onKeyPress: this.onKeyPress,
                onBlur: this.onBlur,
                onFocus: this.onFocus,
                style: {...style, width},
                ...this.getDelegateProps()
            },
            disabled
        });
    }
}
export const comboField = elemFactory(ComboField);