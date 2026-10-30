/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistInputProps, HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div, input} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, StyleProps} from '@xh/hoist/core';
import '@xh/hoist/mobile/register';
import {TEST_ID} from '@xh/hoist/utils/js';
import './SwitchInput.scss';

export interface SwitchInputProps extends HoistProps, HoistInputProps, StyleProps {
    value?: boolean;
}

/**
 * Switch (toggle) control for non-nullable boolean values.
 */
export const [SwitchInput, switchInput] = hoistCmp.withFactory<SwitchInputProps>({
    displayName: 'SwitchInput',
    className: 'xh-switch-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, SwitchInputModel);
    }
});

class SwitchInputModel extends HoistInputModel {
    override xhImpl = true;
}

//-----------------------
// Implementation
//-----------------------
const cmp = hoistCmp.factory<SwitchInputModel>(({model, className, ...props}, ref) => {
    return div({
        ref,
        className,
        style: props.style,
        items: [
            input({
                className: 'xh-switch-input__input',
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
            div({
                className: 'xh-switch-input__toggle',
                item: div({className: 'xh-switch-input__handle'})
            })
        ]
    });
});
