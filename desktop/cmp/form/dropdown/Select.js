/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {Classes, select as bpSelect} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';

import {BaseDropdownInput} from './BaseDropdownInput';
import './Select.scss';

/**
 * A Select Input
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class Select extends BaseDropdownInput {

    static propTypes = {
        ...BaseDropdownInput.propTypes,

        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string, PT.bool])),
        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        itemRenderer: PT.func
    };

    delegateProps = ['className', 'disabled'];

    baseClassName = 'xh-select';

    constructor(props) {
        super(props);
        this.addAutorun(() => this.normalizeOptions(this.props.options));
    }
    
    render() {
        let {style, width, placeholder, disabled} = this.props,
            {renderValue, internalOptions} = this;

        return bpSelect({
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

    onBlur = () => {
        this.noteBlurred();
    }

    onFocus = () => {
        this.noteFocused();
    }

}
export const select = elemFactory(Select);