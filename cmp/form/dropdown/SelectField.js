/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {hoistComponent, elemFactory} from 'hoist/core';
import {Classes, select, button} from 'hoist/kit/blueprint';

import {BaseDropdownField} from './BaseDropdownField';

/**
 * A Select Field
 *
 * See HoistField for properties additional to those documented below.
 */
@hoistComponent()
export class SelectField extends BaseDropdownField {

    static propTypes = {
        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string])).isRequired,
        /** Text to display when control is empty */
        placeholder: PT.string,
        /** Optional custom itemRenderer, a function that receives (item, itemProps) */
        itemRenderer: PT.func
    };

    delegateProps = ['className', 'disabled'];

    render() {
        let {style, width, options, placeholder, disabled} = this.props;

        options = this.normalizeOptions(options);

        const value = this.renderValue;

        return select({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: options,
            onItemSelect: this.onItemSelect,
            itemRenderer: this.getItemRenderer(),
            filterable: false,
            item: button({
                rightIcon: 'caret-down',
                text: this.getDisplayValue(value, options, placeholder),
                style: {...style, width},
                ...this.getDelegateProps()
            }),
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            disabled
        });
    }
}
export const selectField = elemFactory(SelectField);