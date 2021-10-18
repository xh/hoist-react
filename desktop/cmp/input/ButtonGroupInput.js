/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {Button, ButtonGroup, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps, getNonLayoutProps} from '@xh/hoist/utils/react';
import {filter} from 'lodash';
import PT from 'prop-types';
import {cloneElement, Children} from 'react';

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
        return useHoistInputModel(cmp, props, ref, Model);
    }
});
ButtonGroupInput.propTypes = {
    ...HoistInputPropTypes,
    ...ButtonGroup.propTypes,

    /** True to allow buttons to be unselected (aka inactivated). Defaults to false. */
    enableClear: PT.bool,

    /** Intent applied to each button. */
    intent: PT.oneOf(['primary', 'success', 'warning', 'danger']),

    /** True to create minimal-style buttons. */
    minimal: PT.bool,

    /** True to create outlined-style buttons. */
    outlined: PT.bool
};
ButtonGroupInput.hasLayoutSupport = true;


//----------------------------------
// Implementation
//----------------------------------
class Model extends HoistInputModel {

    blur() {
        this.enabledButtons.forEach(it => it.blur());
    }

    focus() {
        this.enabledButtons[0]?.focus();
    }

    get enabledButtons() {
        const btns = this.domEl?.querySelectorAll('button') ?? [];
        return filter(btns, {disabled: false});
    }
}

const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {
        const {
            children,
            //  HoistInput Props
            bind,
            disabled,
            onChange,
            onCommit,
            tabIndex,
            value,
            // ButtonGroupInput Props
            enableClear,
            // Button props applied to each child button
            intent,
            minimal,
            outlined,
            // ...and ButtonGroup gets all the rest
            ...buttonGroupProps
        } = getNonLayoutProps(props);

        const buttons = Children.map(children, button => {
            if (!button) return null;

            const {value, intent: btnIntent} = button.props,
                btnDisabled = disabled || button.props.disabled;

            throwIf(button.type !== Button, 'ButtonGroupInput child must be a Button.');
            throwIf(value == null, 'ButtonGroupInput child must declare a non-null value');

            const active = (model.renderValue === value);
            return cloneElement(button, {
                active,
                intent: btnIntent ?? intent,
                minimal: withDefault(minimal, false),
                outlined: withDefault(outlined, false),
                disabled: withDefault(btnDisabled, false),
                onClick: () => model.noteValueChange(enableClear && active ? null : value),
                // Workaround for https://github.com/palantir/blueprint/issues/3971
                key: `${active} ${value}`,
                autoFocus: active && model.hasFocus
            });
        });

        return buttonGroup({
            items: buttons,
            ...buttonGroupProps,
            minimal: withDefault(minimal, outlined, false),
            ...getLayoutProps(props),
            onBlur: model.onBlur,
            onFocus: model.onFocus,
            className,
            ref
        });
    }
);
