/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {checkbox as onsenCheckbox} from '@xh/hoist/kit/onsen';
import {HoistInput} from '@xh/hoist/cmp/input';

import './Checkbox.scss';

/**
 * Checkbox control for boolean values.
 */
@HoistComponent
export class Checkbox extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.string,

        /** Onsen modifier string */
        modifier: PT.string
    };

    baseClassName = 'xh-check-box';

    render() {
        const {props} = this;

        return onsenCheckbox({
            checked: !!this.renderValue,

            disabled: props.disabled,
            modifier: props.modifier,
            tabIndex: props.tabIndex,

            className: this.getClassName(),
            style: props.style,

            onChange: this.onChange,
            onBlur: this.onBlur,
            onFocus: this.onFocus
        });
    }

    onChange = (e) => {
        this.noteValueChange(e.target.checked);
    };
}
export const checkbox = elemFactory(Checkbox);