/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistInputProps} from '@xh/hoist/cmp/input';
import {HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import type {HoistProps, HSide, StyleProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';
import type {ReactNode} from 'react';
import {useEffect} from 'react';
import {control} from './impl/Control';

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

    const indeterminate = valueIsUnset && displayUnsetState,
        alignIndicator = labelSide === 'left' ? 'right' : 'left',
        inline = withDefault(props.inline, true),
        inputProps = {
            autoFocus: props.autoFocus,
            checked: !!renderValue,
            disabled: props.disabled,
            tabIndex: props.tabIndex,
            id: props.id,
            [TEST_ID]: props.testId,
            ...props.domAttrs,
            onBlur: model.onBlur,
            onFocus: model.onFocus,
            onChange: e => model.noteValueChange(e.target.checked)
        };

    // The indeterminate state has no HTML attribute - set it on the element.
    useEffect(() => {
        const input = model.inputRef.current as HTMLInputElement;
        if (input) input.indeterminate = indeterminate;
    }, [indeterminate, model]);

    return control({
        kind: 'checkbox',
        alignIndicator,
        inline,
        label: props.label,
        className,
        style: props.style,
        ref,
        inputRef: model.inputRef as any,
        inputProps
    });
});
