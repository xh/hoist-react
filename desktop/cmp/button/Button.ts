/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {
    DomAttrsProps,
    HoistModel,
    HoistProps,
    Intent,
    LayoutProps,
    StyleProps,
    TestSupportProps
} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {TEST_ID, withDefault} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isArray} from 'lodash';
import type {ButtonHTMLAttributes, ReactElement, ReactNode} from 'react';
import {createElement} from 'react';
import './Button.scss';

export interface ButtonProps<M extends HoistModel = null>
    extends
        HoistProps<M>,
        StyleProps,
        LayoutProps,
        TestSupportProps,
        DomAttrsProps,
        Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
    /** True to draw the button pressed in, as for a toggle that is on. */
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

    /** Alias for title. */
    tooltip?: string;
}

export interface ButtonDefaults {
    minimal?: boolean;
    outlined?: boolean;
}

/**
 * A clickable button, with optional icons, intent and text. Defaults to the `minimal` style for
 * reduced chrome and adds layout support for top-level sizing and margin/padding props.
 *
 * Relays any other native `<button>` attributes and event handlers to the underlying element.
 */
export const [Button, button] = hoistCmp.withFactory<ButtonProps, ButtonDefaults>({
    displayName: 'Button',
    model: false,
    className: 'xh-button',
    defaults: {
        minimal: true,
        outlined: false
    },

    render(props, ref) {
        const [layoutProps, nonLayoutProps] = splitLayoutProps(props),
            classes = [],
            {defaults} = Button;

        const {
            autoFocus,
            className,
            disabled,
            icon,
            intent,
            minimal = defaults.minimal,
            onClick,
            outlined = defaults.outlined,
            rightIcon,
            style,
            text,
            title,
            tooltip,
            active,
            testId,
            domAttrs,
            children,
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

        const nativeProps = {
            autoFocus,
            [TEST_ID]: testId,
            ...domAttrs,
            disabled,
            onClick,
            style: {
                ...style,
                ...layoutProps
            },
            title: withDefault(title, tooltip),
            ...rest
        };

        // Blueprint's class names are kept, so its styles and app CSS keyed to them apply.
        const hasText = !isEmptyNode(text) || !isEmptyNode(children);
        return createElement(
            'button',
            {
                type: 'button',
                ...nativeProps,
                tabIndex: disabled ? -1 : nativeProps.tabIndex,
                ref,
                className: classNames(
                    'bp6-button',
                    {
                        'bp6-active': active,
                        'bp6-disabled': disabled,
                        [`bp6-intent-${intent}`]: intent,
                        'bp6-minimal': minimal,
                        'bp6-outlined': outlined
                    },
                    className,
                    classes
                )
            },
            icon ?? null,
            hasText
                ? createElement(
                      'span',
                      {className: 'xh-button__text bp6-button-text'},
                      text,
                      children
                  )
                : null,
            rightIcon ?? null
        );
    }
});

//------------------------
// Implementation
//------------------------
function isEmptyNode(node: ReactNode): boolean {
    return (
        node == null ||
        node === '' ||
        node === false ||
        (isArray(node) && node.every(it => isEmptyNode(it)))
    );
}
