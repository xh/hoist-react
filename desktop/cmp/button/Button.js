/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {hoistComponent, elemFactory, useLayoutProps} from '@xh/hoist/core';
import {button as bpButton} from '@xh/hoist/kit/blueprint';
import {getClassName} from '@xh/hoist/utils/react';

import './Button.scss';

/**
 * Wrapper around Blueprint's Button component. Defaults to the `minimal` style for reduced chrome
 * and adds layout support for top-level sizing and margin/padding props.
 *
 * Relays all other props supported by Blueprint's button.
 */
export const Button = hoistComponent({
    displayName: 'Button',

    render(props) {
        const [layoutProps, nonLayoutProps] = useLayoutProps(props),
            {icon, text, onClick, minimal = true, style, autoFocus, ...rest} = nonLayoutProps,
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
            className: getClassName('xh-button', props, classes)
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

export const button = elemFactory(Button);

