/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ButtonProps as BpButtonProps} from '@blueprintjs/core';
import {
    hoistCmp,
    HoistModel,
    HoistProps,
    Intent,
    LayoutProps,
    StyleProps,
    TestSupportProps
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {button as bpButton} from '@xh/hoist/kit/blueprint';
import {TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {ForwardedRef, ReactElement, ReactNode} from 'react';
import './Button.scss';

export interface ButtonProps<M extends HoistModel = null>
    extends HoistProps<M>,
        StyleProps,
        LayoutProps,
        TestSupportProps,
        Omit<BpButtonProps, 'ref'> {
    active?: boolean;
    autoFocus?: boolean;
    disabled?: boolean;
    icon?: ReactElement;
    intent?: Intent;
    minimal?: boolean;
    outlined?: boolean;
    rightIcon?: ReactElement;
    text?: ReactNode;
    title?: string;
    value?: any;

    tabIndex?: number; // TODO: where does this come from?

    /** Alias for title. */
    tooltip?: string;

    ref?: ForwardedRef<HTMLButtonElement>;
}

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
            testId,
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
            ref,
            [TEST_ID]: testId,
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
