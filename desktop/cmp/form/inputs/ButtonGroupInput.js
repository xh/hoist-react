/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {castArray} from 'lodash';
import {HoistComponent, elemFactory} from '@xh/hoist/core/index';
import {buttonGroup} from '@xh/hoist/kit/blueprint/index';
import {throwIf} from '@xh/hoist/utils/js/index';
import {HoistInput} from '@xh/hoist/cmp/form/index';

/**
 * A segmented group of buttons, one of which is depressed to indicate the input's current value.
 *
 * Should receive a list of Buttons as a children. Each Button requires a 'value' prop.
 * The buttons are automatically configured to set this value on click and appear pressed if the
 * ButtonGroupInput's value matches.
 */
@HoistComponent
export class ButtonGroupInput extends HoistInput {

    baseClassName = 'xh-button-group-input';

    render() {
        const children = castArray(this.props.children),
            buttons = children.map(button => {
                const {value} = button.props;

                throwIf(button.type.name !== 'Button', 'ButtonGroupInput child must be a Button.');
                throwIf(!value, 'ButtonGroupInput child must declare a value');

                return React.cloneElement(button, {
                    active: this.renderValue == value,
                    onClick: () => this.noteValueChange(value)
                });
            });

        return buttonGroup(buttons);
    }

}

export const buttonGroupInput = elemFactory(ButtonGroupInput);