/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div, input, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, StyleProps} from '@xh/hoist/core';
import '@xh/hoist/mobile/register';
import {TEST_ID} from '@xh/hoist/utils/js';
import './Checkbox.scss';

export interface CheckboxProps extends HoistProps, HoistInputProps, StyleProps {
    value?: boolean;
}

/**
 * Checkbox control for boolean values.
 */
export const [Checkbox, checkbox] = hoistCmp.withFactory<CheckboxProps>({
    displayName: 'Checkbox',
    className: 'xh-check-box',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, CheckboxInputModel);
    }
});

class CheckboxInputModel extends HoistInputModel {
    override xhImpl = true;
}

//----------------------------------
// Implementation
//----------------------------------
const cmp = hoistCmp.factory<CheckboxInputModel>(({model, className, ...props}, ref) => {
    return div({
        ref,
        className,
        style: props.style,
        items: [
            input({
                className: 'xh-check-box__input',
                type: 'checkbox',
                checked: !!model.renderValue,

                disabled: props.disabled,
                tabIndex: props.tabIndex,

                [TEST_ID]: props.testId,
                ...props.domAttrs,

                onBlur: model.onBlur,
                onFocus: model.onFocus,
                onChange: e => model.noteValueChange(e.target.checked)
            }),
            span({className: 'xh-check-box__checkmark'})
        ]
    });
});
