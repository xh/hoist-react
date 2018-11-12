/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {buttonGroup as bpButtonGroup} from '@xh/hoist/kit/blueprint';

/**
 * Wrapper around Blueprint's ButtonGroup component, with LayoutSupport.
 */
@HoistComponent
@LayoutSupport
export class ButtonGroup extends Component {

    static propTypes = {
        /** True to have all buttons fill available width equally. */
        fill: PT.bool,

        /** True to render each button with minimal surrounding chrome (default false). */
        minimal: PT.bool,

        /** True to render in a vertical orientation. */
        vertical: PT.bool
    };

    baseClassName = 'xh-button-group';

    render() {
        const {fill, minimal, vertical, style, ...rest} = this.getNonLayoutProps();
        return bpButtonGroup({
            fill,
            minimal,
            vertical,

            style: {
                ...style,
                ...this.getLayoutProps()
            },

            ...rest,
            className: this.getClassName()
        });
    }

}
export const buttonGroup = elemFactory(ButtonGroup);