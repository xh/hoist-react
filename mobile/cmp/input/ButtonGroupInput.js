/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {Button, buttonGroup} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {throwIf, warnIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';
import {castArray, isEmpty, without} from 'lodash';
import PT from 'prop-types';
import {Children, cloneElement} from 'react';
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
        warnIf(
            props.enableMulti && !props.enableClear,
            'enableClear prop cannot be set to false when enableMulti is true.  Setting ignored.'
        );
        return useHoistInputModel(cmp, props, ref, Model);
    }
});
ButtonGroupInput.propTypes = {
    ...HoistInputPropTypes,

    /**
     * True to allow buttons to be unselected (aka inactivated). Used when enableMulti is false.
     * Defaults to false.
     */
    enableClear: PT.bool,

    /** True to allow entry/selection of multiple values - "tag picker" style. Defaults to false.*/
    enableMulti: PT.bool
};
ButtonGroupInput.hasLayoutSupport = true;

//----------------------------------
// Implementation
//----------------------------------
class Model extends HoistInputModel {

    get enableMulti() {return !!this.componentProps.enableMulti}
    get enableClear() {return !!this.componentProps.enableClear}

    blur() {
        this.domEl?.blur();
    }

    focus() {
        this.domEl?.focus();
    }
    isActive(value) {
        const {internalValue} = this;
        return this.enableMulti ? internalValue?.includes(value) : internalValue === value;
    }

    onButtonClick(value) {
        const isActive = this.isActive(value);
        if (this.enableMulti) {
            const current = this.internalValue ? castArray(this.internalValue) : [];
            value = isActive ? without(current, value) : [...current, value];
            if (isEmpty(value)) value = null;
        } else {
            value = this.enableClear && isActive ? null : value;
        }
        this.noteValueChange(value);
    }
}

const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {

        const {children, disabled, enableClear, enableMulti, tabIndex = 0, ...rest} = getNonLayoutProps(props);

        const buttons = Children.map(children, button => {
            if (!button) return null;

            const {value} = button.props,
                btnDisabled = disabled || button.props.disabled;

            throwIf(button.type !== Button, 'ButtonGroupInput child must be a Button.');
            throwIf(value == null, 'ButtonGroupInput child must declare a non-null value');

            const isActive = model.isActive(value);

            return cloneElement(button, {
                active: isActive,
                disabled: withDefault(btnDisabled, false),
                onClick: () => model.onButtonClick(value)
            });
        });

        return buttonGroup({
            items: buttons,
            tabIndex,
            onBlur: model.onBlur,
            onFocus: model.onFocus,
            ...rest,
            ...getLayoutProps(props),
            className,
            ref
        });
    }
);
