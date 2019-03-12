/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {checkbox as bpCheckbox} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/input';

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

        /**
         * True to render null or undefined as a distinct visual state.  If false (default),
         * these values will appear unchecked and visually indistinct from false.
         */
        displayUnsetState: PT.bool,

        /** Alignment of the inline label relative to the control itself, default right. */
        labelAlign: PT.oneOf(['left', 'right'])
    };

    baseClassName = 'xh-check-box';

    render() {
        const {props} = this,
            labelAlign = withDefault(props.labelAlign, 'right'),
            displayUnsetState = withDefault(props.displayUnsetState, false),
            valueIsUnset = (this.renderValue === null || this.renderValue === undefined);

        return bpCheckbox({
            checked: !!this.renderValue,
            indeterminate: valueIsUnset && displayUnsetState,
            alignIndicator: labelAlign == 'left' ? 'right' : 'left',
            disabled: props.disabled,
            inline: withDefault(props.inline, true),
            label: props.label,
            tabIndex: props.tabIndex,

            id: props.id,
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