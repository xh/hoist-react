/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {hoistCmp} from '@xh/hoist/core';
import {button as onsenButton, Button as OnsenButton} from '@xh/hoist/kit/onsen';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {hspacer} from '@xh/hoist/cmp/layout';
import classNames from 'classnames';

import './Button.scss';

/**
 * Wrapper around Onsen's Button component. Adds layout support for top-level sizing and
 * margin/padding props. Relays all other props supported by Onsen's Button.
 */
export const [Button, button] = hoistCmp.withFactory({
    displayName: 'Button',
    model: false,
    className: 'xh-button',

    render(props) {
        const [layoutProps, {icon, className, text, modifier, active, onClick, style, ...rest}] = splitLayoutProps(props),
            items = [];

        if (icon && text) {
            items.push(icon, hspacer(8), text);
        } else if (icon) {
            items.push(icon);
        } else if (text) {
            items.push(text);
        }

        return onsenButton({
            items,
            modifier,
            onClick,

            style: {
                ...style,
                ...layoutProps
            },

            ...rest,
            className: classNames(className, active ? 'xh-button-active' : null)
        });
    }
});

Button.propTypes = {
    ...OnsenButton.propTypes,
    active: PT.bool,
    icon: PT.element,
    text: PT.string
};