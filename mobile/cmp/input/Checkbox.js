/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {checkbox as onsenCheckbox} from '@xh/hoist/kit/onsen';
import PT from 'prop-types';
import './Checkbox.scss';

/**
 * Checkbox control for boolean values.
 */
export const [Checkbox, checkbox] = hoistCmp.withFactory({
    displayName: 'Checkbox',
    className: 'xh-check-box',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref);
    }
});
Checkbox.propTypes = {
    ...HoistInputPropTypes,

    value: PT.string,

    /** Onsen modifier string */
    modifier: PT.string
};

//----------------------------------
// Implementation
//----------------------------------
const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {
        return onsenCheckbox({
            checked: !!model.renderValue,

            disabled: props.disabled,
            modifier: props.modifier,
            tabIndex: props.tabIndex,

            style: props.style,

            onBlur: model.onBlur,
            onFocus: model.onFocus,
            onChange: (e) => model.noteValueChange(e.target.checked),

            className,
            ref
        });
    }
);