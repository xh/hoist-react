/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {switchControl} from '@xh/hoist/kit/onsen';
import {HoistInput} from '@xh/hoist/cmp/input';

import './SwitchInput.scss';

/**
 * Switch (toggle) control for non-nullable boolean values.
 */
@HoistComponent
export class SwitchInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.string,

        /** Onsen modifier string */
        modifier: PT.string
    };

    baseClassName = 'xh-switch-input';

    render() {
        const {props} = this;

        return switchControl({
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
export const switchInput = elemFactory(SwitchInput);