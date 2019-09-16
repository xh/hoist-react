/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {hoistCmp} from '@xh/hoist/core';
import {button as bpButton} from '@xh/hoist/kit/blueprint';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';

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
        const [layoutProps, {icon, text, onClick, minimal = true, style, autoFocus, className, ...rest}] = splitLayoutProps(props),
            classes = [];

        if (minimal) classes.push('xh-button--minimal');
        if (autoFocus) classes.push('xh-button--autofocus-enabled');

        return bpButton({
            icon,
            minimal,
            onClick,
            text,
            autoFocus,

            style: {
                ...style,
                ...layoutProps
            },

            ...rest,
            className: classNames(props.className, classes)
        });
    }
});
Button.propTypes = {
    autoFocus: PT.bool,
    icon: PT.element,
    minimal: PT.bool,
    onClick: PT.func,
    style: PT.object,
    text: PT.string,
    title: PT.string
};

