/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hbox} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, HoistProps, Intent, XH} from '@xh/hoist/core';
import {Button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {Children, cloneElement, isValidElement} from 'react';
import './ButtonGroup.scss';

export interface ButtonGroupProps extends HoistProps, BoxProps {
    intent?: Intent;
    minimal?: boolean;
    outlined?: boolean;
}

/**
 * A segmented group of buttons. Should receive a list of Buttons as a children.
 */
export const [ButtonGroup, buttonGroup] = hoistCmp.withFactory<ButtonGroupProps>({
    displayName: 'ButtonGroup',
    className: 'xh-button-group',
    model: false,

    render(props, ref) {
        const {children, className, intent, minimal, outlined, ...rest} = props;

        const items = Children.map(children, button => {
            if (!button) return null;
            if (!isValidElement(button) || button.type !== Button) {
                throw XH.exception('ButtonGroup child must be a Button.');
            }
            const props = button.props as ButtonProps,
                btnIntent = intent ?? props.intent,
                btnMinimal = minimal ?? props.minimal,
                btnOutlined = outlined ?? props.outlined;

            return cloneElement(button, {
                intent: btnIntent,
                minimal: btnMinimal,
                outlined: btnOutlined
            } as ButtonProps);
        });

        return hbox({
            items,
            className,
            ...rest,
            ref
        });
    }
});
