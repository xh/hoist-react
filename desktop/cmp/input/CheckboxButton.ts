/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/desktop/register';
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {withDefault} from '@xh/hoist/utils/js';
import {ReactElement} from 'react';
import './CheckboxButton.scss';

export interface CheckboxButtonProps extends Omit<ButtonProps, 'onChange'>, HoistInputProps {
    value?: boolean;

    /** Icon to display when checked. Defaults to a solid check-square icon with primary intent. */
    checkedIcon?: ReactElement;

    /** Icon to display when unchecked. Defaults to a light outlined square icon. */
    uncheckedIcon?: ReactElement;
}

/**
 * A button-based input to represent and toggle a boolean value.
 * Renders with a solid "checked" checkbox icon when true and an empty checkbox square when false.
 * If rendered within a FormField, will use its bound field's displayName for its text by default.
 */
export const [CheckboxButton, checkboxButton] = hoistCmp.withFactory<CheckboxButtonProps>({
    displayName: 'CheckboxButton',
    className: 'xh-checkbox-button',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, CheckboxButtonInputModel);
    }
});

class CheckboxButtonInputModel extends HoistInputModel {
    override xhImpl = true;
}

//----------------------------------
// Implementation
//----------------------------------
const cmp = hoistCmp.factory<CheckboxButtonInputModel>(
    ({model, text, checkedIcon, uncheckedIcon, ...props}, ref) => {
        const checked = !!model.renderValue;
        return button({
            text: withDefault(text, model.getField()?.displayName),
            icon: checked
                ? withDefault(checkedIcon, Icon.checkSquare({prefix: 'fas', intent: 'primary'}))
                : withDefault(uncheckedIcon, Icon.square({prefix: 'fal'})),
            outlined: true,
            onClick: () => model.noteValueChange(!checked),
            ...props,
            ref
        });
    }
);
