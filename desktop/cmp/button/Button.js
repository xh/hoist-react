/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {button as bpButton} from '@xh/hoist/kit/blueprint';

import './Button.scss';


/**
 * Wrapper around Blueprint's Button component. Defaults to the `minimal` style for reduced chrome
 * and adds LayoutSupport for top-level sizing and margin/padding props.
 *
 * Relays all other props supported by Blueprint's button.
 */
@HoistComponent
@LayoutSupport
export class Button extends Component {

    static propTypes = {
        icon: PT.element,
        minimal: PT.bool,
        onClick: PT.func,
        style: PT.object,
        text: PT.string,
        title: PT.string,
        autoFocus: PT.bool
    };

    baseClassName = 'xh-button';

    render() {
        const {icon, text, onClick, minimal = true, style, autoFocus, ...rest} = this.getNonLayoutProps(),
            autoFocusClassName = autoFocus ? ' xh-button--autofocus-enabled' : '';
        return bpButton({
            icon,
            minimal,
            onClick,
            text,
            autoFocus,

            style: {
                ...style,
                ...this.getLayoutProps()
            },

            ...rest,
            className: this.getClassName(minimal ? `xh-button--minimal${autoFocusClassName}` : autoFocusClassName)
        });
    }

}
export const button = elemFactory(Button);