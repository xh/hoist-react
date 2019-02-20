/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {button as onsenButton} from '@xh/hoist/kit/onsen';
import {hspacer} from '@xh/hoist/cmp/layout';

import './Button.scss';

/**
 * Wrapper around Onsen's Button component. Adds LayoutSupport for top-level sizing and margin/padding props.
 * Relays all other props supported by Onsen's Button.
 */
@HoistComponent
@LayoutSupport
export class Button extends Component {

    static propTypes = {
        icon: PT.element,
        text: PT.string,
        modifier: PT.string,
        active: PT.bool,
        onClick: PT.func
    };

    baseClassName = 'xh-button';

    render() {
        const {icon, text, modifier, active, onClick, style, ...rest} = this.getNonLayoutProps(),
            items = [];

        if (icon && text) {
            items.push(icon, hspacer(10), text);
        } else if (icon) {
            items.push(icon);
        } else {
            items.push(text);
        }

        return onsenButton({
            items,
            modifier,
            onClick,

            style: {
                ...style,
                ...this.getLayoutProps()
            },

            ...rest,
            className: this.getClassName(active ? 'xh-button-active' : null)
        });
    }

}
export const button = elemFactory(Button);