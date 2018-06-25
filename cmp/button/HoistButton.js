/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {button as bpButton} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';

/**
 * Wrapper around Blueprint's Button component.
 * Hoist's most basic button is preconfigured with a generic click icon and title for override
 * Accepts props documented below as well as any supported by Blueprint's Button.
 *
 * Must be provided an onClick handler.
 */
@HoistComponent()
export class Button extends Component {

    static propTypes = {
        icon: PT.element,
        title: PT.string,
        onClick: PT.func,
        model: PT.object
    };

    render() {
        const {icon, onClick, ...rest} = this.props;
        return bpButton({
            icon: icon || Icon.click(),
            title: this.title || 'Click',
            onClick: onClick,
            ...rest
        });
    }

}
export const button = elemFactory(Button);