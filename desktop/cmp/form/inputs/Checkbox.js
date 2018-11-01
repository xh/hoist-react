/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {checkbox as bpCheckbox} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * Checkbox control for boolean values.
 * Renders null with an "indeterminate" [-] display.
 */
@HoistComponent
export class Checkbox extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.bool,

        /** True (default) if the control should appear as an inline element. */
        inline: PT.bool,

        /**
         * Label text displayed adjacent to the control itself.
         * Can be used with or without an additional overall label as provided by FormField.
         */
        label: PT.string,

        /** Alignment of the inline label relative to the control itself, default right. */
        labelAlign: PT.oneOf(['left', 'right'])
    };

    baseClassName = 'xh-check-box';

    render() {
        const {props} = this,
            labelAlign = withDefault(props.labelAlign, 'right'),
            nullValue = this.renderValue == null;

        return bpCheckbox({
            // Always specify checked to ensure input is in controlled mode.
            checked: nullValue ? false : !!this.renderValue,
            indeterminate: nullValue,

            alignIndicator: labelAlign == 'left' ? 'right' : 'left',
            disabled: props.disabled,
            inline: withDefault(props.inline, true),
            label: props.label,
            tabIndex: props.tabIndex,

            className: this.getClassName(),
            style: props.style,

            onBlur: this.onBlur,
            onChange: this.onChange,
            onFocus: this.onFocus
        });
    }

    onChange = (e) => {
        this.noteValueChange(e.target.checked);
    }
}
export const checkbox = elemFactory(Checkbox);