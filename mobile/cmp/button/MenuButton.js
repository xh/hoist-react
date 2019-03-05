/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';

/**
 * Convenience Button preconfigured for use as a trigger for a dropdown menu operation.
 *
 * Must be provided either an onClick handler *or* a MenuModel. If a MenuModel is provided, this button
 * will display the menu.
 */
@HoistComponent
export class MenuButton extends Component {

    static propTypes = {
        icon: PT.element,
        onClick: PT.func,
        model: PT.object
    };

    render() {
        const {icon, onClick, ...rest} = this.props;
        return button({
            icon: icon || Icon.bars(),
            onClick: onClick || this.onClick,
            ...rest
        });
    }

    //-------------------------
    // Implementation
    //---------------------------
    onClick = () => {
        this.model.open();
    }

}

export const menuButton = elemFactory(MenuButton);