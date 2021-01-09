/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {switchControl} from '@xh/hoist/kit/onsen';
import PT from 'prop-types';
import './SwitchInput.scss';

/**
 * Switch (toggle) control for non-nullable boolean values.
 */
export const [SwitchInput, switchInput] = hoistCmp.withFactory({
    displayName: 'SwitchInput',
    className: 'xh-switch-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref);
    }
});
SwitchInput.propTypes = {
    ...HoistInputPropTypes,

    value: PT.string,

    /** Onsen modifier string */
    modifier: PT.string
};


//-----------------------
// Implementation
//-----------------------
const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {

        return switchControl({
            checked: !!model.renderValue,

            disabled: props.disabled,
            modifier: props.modifier,
            tabIndex: props.tabIndex,

            className,
            style: props.style,

            onBlur: model.onBlur,
            onFocus: model.onFocus,
            onChange: (e) => model.noteValueChange(e.target.checked),

            ref
        });
    }
);