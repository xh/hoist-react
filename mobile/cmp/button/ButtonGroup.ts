/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hbox} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, Intent} from '@xh/hoist/core';
import {Button} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {throwIf} from '@xh/hoist/utils/js';
import {Children, cloneElement} from 'react';
import './ButtonGroup.scss';

export interface ButtonGroupProps extends BoxProps {
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
            throwIf(button.type !== Button, 'ButtonGroup child must be a Button.');

            const btnIntent = intent ?? button.props.intent,
                btnMinimal = minimal ?? button.props.minimal,
                btnOutlined = outlined ?? button.props.outlined;

            return cloneElement(button, {
                intent: btnIntent,
                minimal: btnMinimal,
                outlined: btnOutlined
            });
        });

        return hbox({
            items,
            className,
            ...rest,
            ref
        });
    }
});
