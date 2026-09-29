/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, hbox, hframe} from '@xh/hoist/cmp/layout';
import {markdown} from '@xh/hoist/cmp/markdown';
import {hoistCmp, HoistProps, Intent, StyleProps, TestSupportProps} from '@xh/hoist/core';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {Icon} from '@xh/hoist/icon';
import {getTestId} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isEmpty, isString} from 'lodash';
import {ReactElement, ReactNode} from 'react';
import './Banner.scss';

export interface BannerProps extends HoistProps<null>, StyleProps, TestSupportProps {
    /**
     * Message to display. Strings are rendered as markdown, supporting inline **bold**,
     * *italics*, and [links](url).
     */
    message?: ReactNode;

    /**
     * Icon shown before the message. Defaults to a standard icon for the banner's `intent`.
     * Set to null to show no icon.
     */
    icon?: ReactElement;

    /** Intent for the banner's color and default icon. Defaults to 'primary'. Null for neutral. */
    intent?: Intent;

    /**
     * True to render with a solid intent background and white text, for maximum emphasis.
     * The default is a lighter, tinted background suited to banners within Panels and forms.
     */
    filled?: boolean;

    /** True to render with reduced padding, height and font size. */
    compact?: boolean;

    /** False to truncate a long message to a single line. Default true to wrap. */
    wrap?: boolean;

    /** Props for a button rendered within the banner, for a related action. */
    actionButtonProps?: ButtonProps;

    /** Callback when the user clicks the banner's icon or message. */
    onClick?: () => void;

    /**
     * Callback when the user clicks the banner's close button. The button is shown only when this
     * callback is provided. The banner is controlled - the callback must stop rendering it.
     */
    onClose?: () => void;
}

/**
 * A strip showing a message with an intent-colored background, for info, warning, and error
 * states local to part of an app. Commonly shown within a Panel via its `banner` prop.
 *
 * See `XH.showBanner()` to show a banner across the top of the entire app.
 */
export const [Banner, banner] = hoistCmp.withFactory<BannerProps>({
    displayName: 'Banner',
    className: 'xh-banner',
    model: false,

    render({
        className,
        style,
        testId,
        message,
        icon,
        intent = 'primary',
        filled = false,
        compact = false,
        wrap = true,
        actionButtonProps,
        onClick,
        onClose
    }) {
        if (icon === undefined) icon = defaultIcon(intent);

        return hbox({
            className: classNames(
                className,
                `xh-banner--${intent ?? 'none'}`,
                filled ? ['xh-banner--filled', `xh-bg-intent-${intent ?? 'none'}`] : null,
                compact ? 'xh-banner--compact' : null,
                wrap ? null : 'xh-banner--nowrap',
                onClick ? 'xh-banner--clickable' : null
            ),
            style,
            testId,
            items: [
                hframe({
                    className: 'xh-banner__content',
                    onClick,
                    items: [
                        icon,
                        div({
                            className: 'xh-banner__message',
                            title: isString(message) && !wrap ? message : undefined,
                            item: isString(message) ? markdown({content: message}) : message
                        })
                    ]
                }),
                isEmpty(actionButtonProps)
                    ? null
                    : button({
                          outlined: true,
                          intent: filled ? undefined : intent,
                          ...actionButtonProps,
                          className: classNames(
                              'xh-banner__action-button',
                              actionButtonProps.className
                          ),
                          testId: actionButtonProps.testId ?? getTestId(testId, 'action-btn')
                      }),
                onClose
                    ? button({
                          icon: Icon.close(),
                          minimal: true,
                          className: 'xh-banner__dismiss-button',
                          testId: getTestId(testId, 'dismiss-btn'),
                          onClick: onClose
                      })
                    : null
            ]
        });
    }
});

//------------------------
// Implementation
//------------------------
function defaultIcon(intent: Intent): ReactElement {
    switch (intent) {
        case 'primary':
            return Icon.info();
        case 'success':
            return Icon.success();
        case 'warning':
            return Icon.warning();
        case 'danger':
            return Icon.danger();
        default:
            return null;
    }
}
