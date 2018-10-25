/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import React from 'react';
import {castArray} from 'lodash';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {buttonGroup} from '@xh/hoist/kit/blueprint';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * A segmented group of buttons, one of which is depressed to indicate the input's current value.
 *
 * Should receive a list of Buttons as a children. Each Button requires a 'value' prop.
 * The buttons are automatically configured to set this value on click and appear pressed if the
 * ButtonGroupInput's value matches.
 */
@HoistComponent
export class ButtonGroupInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** True to have all buttons fill available width equally. */
        fill: PT.bool,

        /** True to render each button with minimal surrounding chrome. */
        minimal: PT.bool,

        /** True to render in a vertical orientation. */
        vertical: PT.bool
    };

    baseClassName = 'xh-button-group-input';

    render() {
        const {props} = this,
            children = castArray(props.children),
            buttons = children.map(button => {
                const {value} = button.props;

                throwIf(button.type.name !== 'Button', 'ButtonGroupInput child must be a Button.');
                throwIf(!value, 'ButtonGroupInput child must declare a value');

                return React.cloneElement(button, {
                    active: this.renderValue == value,
                    onClick: () => this.noteValueChange(value)
                });
            });

        return buttonGroup({
            className: this.getClassName(),
            fill: withDefault(props.fill, false),
            minimal: withDefault(props.minimal, false),
            vertical: withDefault(props.vertical, false),
            items: buttons
        });
    }

}

export const buttonGroupInput = elemFactory(ButtonGroupInput);