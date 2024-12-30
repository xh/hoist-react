/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp, HoistProps, HSide, StyleProps} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {checkbox as bpCheckbox} from '@xh/hoist/kit/blueprint';
import {TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';
import {ReactNode} from 'react';

import './Checkbox.scss';

export interface CheckboxProps extends HoistProps, HoistInputProps, StyleProps {
    value?: boolean;

    /** True to focus the control on render. */
    autoFocus?: boolean;

    /** True (default) if the control should appear as an inline element. */
    inline?: boolean;

    /**
     * Label displayed adjacent to the control itself.
     * Can be used with or without an additional overall label as provided by FormField.
     */
    label?: ReactNode;

    /**
     * True to render null or undefined as a distinct visual state.  If false (default),
     * these values will appear unchecked and visually indistinct from false.
     */
    displayUnsetState?: boolean;

    /** Placement of the inline label relative to the control itself, default 'right'. */
    labelSide?: HSide;
}

/**
 * Checkbox control for boolean values.
 * Renders null with an "indeterminate" [-] display.
 */
export const [Checkbox, checkbox] = hoistCmp.withFactory<CheckboxProps>({
    displayName: 'Checkbox',
    className: 'xh-check-box',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, CheckboxInputModel);
    }
});

//----------------------------------
// Implementation
//----------------------------------
class CheckboxInputModel extends HoistInputModel {
    override xhImpl = true;
}

const cmp = hoistCmp.factory<CheckboxInputModel>(({model, className, ...props}, ref) => {
    const {renderValue} = model,
        labelSide = withDefault(props.labelSide, 'right'),
        displayUnsetState = withDefault(props.displayUnsetState, false),
        valueIsUnset = isNil(renderValue);

    return bpCheckbox({
        autoFocus: props.autoFocus,
        checked: !!renderValue,
        indeterminate: valueIsUnset && displayUnsetState,
        alignIndicator: labelSide === 'left' ? 'right' : 'left',
        disabled: props.disabled,
        inline: withDefault(props.inline, true),
        label: props.label,
        tabIndex: props.tabIndex,
        id: props.id,
        [TEST_ID]: props.testId,
        className,
        style: props.style,

        onBlur: model.onBlur,
        onFocus: model.onFocus,
        onChange: e => model.noteValueChange(e.target.checked),
        inputRef: model.inputRef,
        ref
    });
});
