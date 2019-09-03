/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {castArray} from 'lodash';
import {HoistComponent, LayoutSupport, elemFactory} from '@xh/hoist/core';
import {Button, ButtonGroup, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/input';
import PT from 'prop-types';

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
        enableClear: PT.bool
    };

    baseClassName = 'xh-button-group-input';

    render() {
        const {children, minimal, disabled, enableClear, ...rest} = this.getNonLayoutProps();

        const buttons = castArray(children).map(button => {
            if (!button) return null;

            const {value} = button.props,
                btnDisabled = disabled || button.props.disabled;

            throwIf(button.type !== Button, 'ButtonGroupInput child must be a Button.');
            throwIf(value == null, 'ButtonGroupInput child must declare a non-null value');

            const active = (this.renderValue === value);
            return React.cloneElement(button, {
                active,
                minimal: withDefault(minimal, false),
                disabled: withDefault(btnDisabled, false),
                onClick: () => {
                    if (enableClear) {
                        this.noteValueChange(active ? null : value);
                    } else {
                        this.noteValueChange(value);
                    }
                }
            });
        });

        return buttonGroup({
            items: buttons,
            ...rest,
            ...this.getLayoutProps(),
            className: this.getClassName()
        });
    }

}

export const buttonGroupInput = elemFactory(ButtonGroupInput);