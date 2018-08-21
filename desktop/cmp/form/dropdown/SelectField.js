/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {Classes, select} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';

import {BaseDropdownField} from './BaseDropdownField';
import './SelectField.scss';

/**
 * A Select Field
 *
 * @see HoistField for properties additional to those documented below.
 */
@HoistComponent()
export class SelectField extends BaseDropdownField {

    static propTypes = {
        ...BaseDropdownField.propTypes,

        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.bool])).isRequired,
        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        itemRenderer: PT.func
    };

    delegateProps = ['className', 'disabled'];

    baseClassName = 'xh-select-field';

    constructor(props) {
        super(props);
        this.internalOptions = this.normalizeOptions(props.options);
    }

    componentDidMount() {
        this.addAutorun(() => this.internalOptions = this.normalizeOptions(this.props.options));
    }

    render() {
        let {style, width, placeholder, disabled} = this.props,
            {renderValue, internalOptions} = this;

        return select({
            className: this.getClassName(),
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: internalOptions,
            onItemSelect: this.onItemSelect,
            itemRenderer: this.getOptionRenderer(),
            filterable: false,
            item: button({
                rightIcon: 'caret-down',
                text: this.getDisplayValue(renderValue, internalOptions, placeholder),
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