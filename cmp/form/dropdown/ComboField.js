/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {startsWith} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {Classes, suggest} from 'hoist/kit/blueprint';

import {BaseComboField} from './BaseComboField';

/**
 * ComboBox Field - A field with type ahead suggest and menu select
 *
 * @see HoistField for properties additional to those documented below.
 */
@hoistComponent()
export class ComboField extends BaseComboField {

    static propTypes = {
        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string])).isRequired,
        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        optionRenderer: PT.func,
        /** Whether to force values from given options. Set to true to disallow arbitrary input */
        requireSelection: PT.bool
    };

    delegateProps = ['className', 'disabled', 'placeholder'];

    constructor(props) {
        super(props);
        this.options = this.normalizeOptions(props.options);
    }

    render() {
        const {style, width, disabled} = this.props,
            {renderValue, options} = this;


        return suggest({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: options,
            onItemSelect: this.onItemSelect,
            itemPredicate: (q, item) => {
                return startsWith(item.label.toLowerCase(), q.toLowerCase());
            },
            itemRenderer: this.getOptionRenderer(),
            inputValueRenderer: s => s,
            inputProps: {
                value: this.getDisplayValue(renderValue, options, ''),
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