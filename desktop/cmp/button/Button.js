/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {button as bpButton} from '@xh/hoist/kit/blueprint';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import PT from 'prop-types';
import './Button.scss';

/**
 * Wrapper around Blueprint's Button component. Defaults to the `minimal` style for reduced chrome
 * and adds layout support for top-level sizing and margin/padding props.
 *
 * Relays all other props supported by Blueprint's button.
 */
export const [Button, button] = hoistCmp.withFactory({
    displayName: 'Button',
    model: false,
    className: 'xh-button',

    render(props) {
        const [layoutProps, {
                autoFocus, className, disabled, icon, intent, minimal = true, onClick, outlined, style, text, title, active, ...rest
            }] = splitLayoutProps(props),
            classes = [];

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
            disabled,
            icon,
            intent,
            minimal,
            onClick,
            outlined,
            style: {
                ...style,
                ...layoutProps
            },
            text,
            title,
            ...rest
        });
    }
});

Button.propTypes = {
    active: PT.bool,
    autoFocus: PT.bool,
    className: PT.string,
    disabled: PT.bool,
    icon: PT.element,
    intent: PT.oneOf(['primary', 'success', 'warning', 'danger']),
    minimal: PT.bool,
    onClick: PT.func,
    outlined: PT.bool,
    style: PT.object,
    text: PT.node,
    title: PT.string
};

