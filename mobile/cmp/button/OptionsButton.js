/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience Button preconfigured for use as a trigger for opening the XH options dialog.
 *
 * Can be provided an onClick handler, otherwise will use default action provided by framework.
 */
@HoistComponent
export class OptionsButton extends Component {

    static propTypes = {
        icon: PT.element,
        onClick: PT.func
    };

    render() {
        if (!XH.acm.optionsDialogModel.hasOptions) return null;
        const {icon, onClick, ...rest} = this.props;
        return button({
            icon: icon || Icon.gear(),
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