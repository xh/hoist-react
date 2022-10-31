/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hspacer} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, HoistModel, HoistProps, Intent} from '@xh/hoist/core';
import {button as onsenButton} from '@xh/hoist/kit/onsen';
import '@xh/hoist/mobile/register';
import {apiDeprecated} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {ReactNode, ReactElement} from 'react';
import './Button.scss';

export interface ButtonProps<M extends HoistModel=HoistModel> extends HoistProps<M>, BoxProps {
    active?: boolean;
    disabled?: boolean;
    icon?: ReactElement;
    intent?: Intent;
    minimal?: boolean;
    outlined?: boolean;
    text?: ReactNode;
    value?: any;
    modifier?: any;
}

/**
 * Wrapper around Onsen's Button component. Adds layout support for top-level sizing and
 * margin/padding props. Relays all other props supported by Onsen's Button.
 */
export const [Button, button] = hoistCmp.withFactory<ButtonProps>({
    displayName: 'Button',
    model: false,
    className: 'xh-button',

    render(props, ref) {
        const [layoutProps, nonLayoutProps] = splitLayoutProps(props),
            classes = [],
            items = [];

        const {
            active,
            className,
            disabled,
            icon,
            intent,
            onClick,
            style,
            text,
            ...rest
        } = nonLayoutProps;

        let {outlined, minimal} = nonLayoutProps;
        if (rest?.modifier === 'outline') {
            apiDeprecated('Button.modifier = `outline`', {msg: 'Use `outlined` instead', v: 'v47'});
            outlined = outlined ?? true;
        }
        if (rest?.modifier === 'quiet') {
            apiDeprecated('Button.modifier = `quiet`', {msg: 'Use `minimal` instead', v: 'v47'});
            minimal = minimal ?? true;
        }

        if (disabled) {
            classes.push('xh-button--disabled');
        } else {
            classes.push('xh-button--enabled');
        }

        if (intent) {
            classes.push(`xh-button--intent-${intent}`);
        } else {
            classes.push(`xh-button--intent-none`);
        }

        if (minimal) classes.push('xh-button--minimal');
        if (outlined) classes.push('xh-button--outlined');
        if (!minimal && !outlined) classes.push('xh-button--standard');
        if (active) classes.push('xh-button--active');

        if (icon && text) {
            items.push(icon, hspacer(8), text);
        } else if (icon) {
            items.push(icon);
        } else if (text) {
            items.push(text);
        }

        return onsenButton({
            ref,
            items,
            onClick,
            disabled,
            className: classNames(className, classes),
            style: {
                ...style,
                ...layoutProps
            },
            ...rest
        });
    }
});
