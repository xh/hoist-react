/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInput} from '@xh/hoist/cmp/input';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {Button, ButtonGroup, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {castArray} from 'lodash';
import PT from 'prop-types';
import {cloneElement} from 'react';

/**
 * A segmented group of buttons, one of which is depressed to indicate the input's current value.
 *
 * Should receive a list of Buttons as a children. Each Button requires a 'value' prop.
 * The buttons are automatically configured to set this value on click and appear pressed if the
 * ButtonGroupInput's value matches.
 */
@HoistComponent
@LayoutSupport
export class ButtonGroupInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
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

    baseClassName = 'xh-button-group-input';

    render() {
        const {
            children,
            //  HoistInput Props
            bind,
            disabled,
            model,
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
        } = this.getNonLayoutProps();

        const buttons = castArray(children).map(button => {
            if (!button) return null;

            const {value} = button.props,
                btnDisabled = disabled || button.props.disabled;

            throwIf(button.type !== Button, 'ButtonGroupInput child must be a Button.');
            throwIf(value == null, 'ButtonGroupInput child must declare a non-null value');

            const active = (this.renderValue === value);
            return cloneElement(button, {
                active,
                intent,
                minimal: withDefault(minimal, false),
                outlined: withDefault(outlined, false),
                disabled: withDefault(btnDisabled, false),
                onClick: () => {
                    if (enableClear) {
                        this.noteValueChange(active ? null : value);
                    } else {
                        this.noteValueChange(value);
                    }
                },
                // Workaround for https://github.com/palantir/blueprint/issues/3971
                key: `${active} ${value}`
            });
        });

        return buttonGroup({
            items: buttons,
            ...buttonGroupProps,
            minimal: withDefault(minimal, outlined, false),
            ...this.getLayoutProps(),
            className: this.getClassName()
        });
    }

}

export const buttonGroupInput = elemFactory(ButtonGroupInput);