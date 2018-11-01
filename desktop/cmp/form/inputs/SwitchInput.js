/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {switchControl} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * Switch (toggle) control for non-nullable boolean values.
 */
@HoistComponent
export class SwitchInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.bool,

        /** True if the control should appear as an inline element (defaults to true). */
        inline: PT.bool,

        /**
         * Label text displayed adjacent to the control itself.
         * Can be used with or without an additional overall label as provided by FormField.
         */
        label: PT.string,

        /** Alignment of the inline label relative to the control itself, default right. */
        labelAlign: PT.oneOf(['left', 'right'])
    };

    baseClassName = 'xh-switch-input';

    render() {
        const {props} = this,
            labelAlign = withDefault(props.labelAlign, 'right');

        return switchControl({
            checked: !!this.renderValue,

            alignIndicator: labelAlign == 'left' ? 'right' : 'left',
            disabled: props.disabled,
            inline: withDefault(props.inline, true),
            label: props.label,
            style: props.style,
            tabIndex: props.tabIndex,

            className: this.getClassName(),

            onBlur: this.onBlur,
            onChange: this.onChange,
            onFocus: this.onFocus
        });
    }

    onChange = (e) => {
        this.noteValueChange(e.target.checked);
    };
}
export const switchInput = elemFactory(SwitchInput);
