/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {checkbox as bpCheckbox} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import {hoistCmp} from '@xh/hoist/core';
import {isNil} from 'lodash';

/**
 * Checkbox control for boolean values.
 * Renders null with an "indeterminate" [-] display.
 */
export const [Checkbox, checkbox] = hoistCmp.withFactory({
    displayName: 'Checkbox',
    className: 'xh-check-box',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref);
    }
});

Checkbox.propTypes = {
    ...HoistInputPropTypes,

    /** True to focus the control on render. */
    autoFocus: PT.bool,

    value: PT.bool,

    /** True (default) if the control should appear as an inline element. */
    inline: PT.bool,

    /**
     * Label displayed adjacent to the control itself.
     * Can be used with or without an additional overall label as provided by FormField.
     */
    label: PT.oneOfType([PT.string, PT.element]),

    /**
     * True to render null or undefined as a distinct visual state.  If false (default),
     * these values will appear unchecked and visually indistinct from false.
     */
    displayUnsetState: PT.bool,

    /** Alignment of the inline label relative to the control itself, default right. */
    labelAlign: PT.oneOf(['left', 'right'])
};

//----------------------------------
// Implementation
//----------------------------------
const cmp = hoistCmp.factory(
    ({model, className, ...props}, ref) => {
        const {renderValue} = model,
            labelAlign = withDefault(props.labelAlign, 'right'),
            displayUnsetState = withDefault(props.displayUnsetState, false),
            valueIsUnset = isNil(renderValue);

        return bpCheckbox({
            autoFocus: props.autoFocus,
            checked: !!renderValue,
            indeterminate: valueIsUnset && displayUnsetState,
            alignIndicator: labelAlign === 'left' ? 'right' : 'left',
            disabled: props.disabled,
            inline: withDefault(props.inline, true),
            label: props.label,
            tabIndex: props.tabIndex,

            id: props.id,
            className,
            style: props.style,

            onBlur: model.onBlur,
            onFocus: model.onFocus,
            onChange: (e) => model.noteValueChange(e.target.checked),
            ref
        });
    }
);