/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {BoxProps, hoistCmp, Intent} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {button as bpButton} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {ReactNode, ReactElement} from 'react';
import type * as CSS from 'csstype';
import './Button.scss';

/**
 * Wrapper around Blueprint's Button component. Defaults to the `minimal` style for reduced chrome
 * and adds layout support for top-level sizing and margin/padding props.
 *
 * Relays all other props supported by Blueprint's button.
 */
export const [Button, button] = hoistCmp.withFactory<ButtonProps>({
    displayName: 'Button',
    model: false,
    className: 'xh-button',

    render(props, ref) {
        const [layoutProps, nonLayoutProps] = splitLayoutProps(props),
            classes = [];

        const {
            autoFocus,
            className,
            disabled,
            icon,
            intent,
            minimal = true,
            onClick,
            outlined,
            rightIcon,
            style,
            text,
            title,
            tooltip,
            active,
            elementRef,
            ...rest
        } = nonLayoutProps;

        if (autoFocus) classes.push('xh-button--autofocus-enabled');

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

        return bpButton({
            active,
            autoFocus,
            className: classNames(className, classes),
            elementRef: composeRefs(ref, elementRef),
            disabled,
            icon,
            intent,
            minimal,
            onClick,
            outlined,
            rightIcon,
            style: {
                ...style,
                ...layoutProps
            },
            text,
            title: withDefault(title, tooltip),
            ...rest
        });
    }
});

export interface ButtonProps extends BoxProps {
    active?: boolean,
    autoFocus?: boolean,
    disabled?: boolean,
    icon?: ReactElement;
    intent?: Intent,
    minimal?: boolean,
    onClick?: (e: any) => void,
    outlined?: boolean,
    rightIcon?: ReactElement;
    style?: CSS.Properties,
    text?: ReactNode,
    title?: string,
    /** Alias for title. */
    tooltip?: string
}
