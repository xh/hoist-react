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
 * @see HoistField for properties additional to those documented below.
 */
@hoistComponent()
export class SelectField extends BaseDropdownField {

    static propTypes = {
        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.bool])).isRequired,
        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        itemRenderer: PT.func
    };

    delegateProps = ['className', 'disabled'];

    constructor(props) {
        super(props);
        this.options = this.normalizeOptions(props.options);
    }

    render() {
        let {style, width, placeholder, disabled} = this.props,
            {renderValue, options} = this;

        return select({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: options,
            onItemSelect: this.onItemSelect,
            itemRenderer: this.getOptionRenderer(),
            filterable: false,
            item: button({
                rightIcon: 'caret-down',
                text: this.getDisplayValue(renderValue, options, placeholder),
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