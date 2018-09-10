/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {button} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience Button preconfigured for use as a trigger for opening the XH options dialog.
 *
 * Can be provided an onClick handler, otherwise will call default framework handler.
 */
@HoistComponent
export class OptionsButton extends Component {

    static propTypes = {
        icon: PT.element,
        title: PT.string,
        onClick: PT.func
    };

    render() {
        if (!XH.acm.optionsDialogModel.hasOptions) return null;
        const {icon, onClick, ...rest} = this.props;
        return button({
            icon: icon || Icon.gear(),
            title: this.title || 'Options',
            onClick: onClick || this.onOptionsClick,
            ...rest
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    onOptionsClick = () => {
        XH.showOptionsDialog();
    }

}
export const optionsButton = elemFactory(OptionsButton);