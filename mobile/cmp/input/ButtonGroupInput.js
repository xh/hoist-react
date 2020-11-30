/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {Button, buttonGroup} from '@xh/hoist/mobile/cmp/button';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';
import {castArray} from 'lodash';
import PT from 'prop-types';
import {cloneElement} from 'react';
import './ButtonGroupInput.scss';

/**
 * A segmented group of buttons, one of which is depressed to indicate the input's current value.
 *
 * Should receive a list of Buttons as a children. Each Button requires a 'value' prop.
 * The buttons are automatically configured to set this value on click and appear pressed if the
 * ButtonGroupInput's value matches.
 */
export const [ButtonGroupInput, buttonGroupInput] = hoistCmp.withFactory({
    displayName: 'ButtonGroupInput',
    className: 'xh-button-group-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref);
    }
});
ButtonGroupInput.propTypes = {
    ...HoistInputPropTypes,

    /** True to allow buttons to be unselected (aka inactivated). Defaults to false. */
    enableClear: PT.bool
};
ButtonGroupInput.hasLayoutSupport = true;

//----------------------------------
// Implementation
//----------------------------------
const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {

        const {children, disabled, enableClear, ...rest} = getNonLayoutProps(props);

        const buttons = castArray(children).map(button => {
            if (!button) return null;

            const {value} = button.props,
                btnDisabled = disabled || button.props.disabled;

            throwIf(button.type !== Button, 'ButtonGroupInput child must be a Button.');
            throwIf(value == null, 'ButtonGroupInput child must declare a non-null value');

            const active = (model.renderValue === value);
            return cloneElement(button, {
                active,
                disabled: withDefault(btnDisabled, false),
                onClick: () => model.noteValueChange(enableClear && active ? null : value)
            });
        });

        return buttonGroup({
            items: buttons,
            ...rest,
            ...getLayoutProps(props),
            className,
            ref
        });
    }
);