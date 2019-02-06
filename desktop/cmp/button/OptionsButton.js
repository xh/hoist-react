/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {button, Button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * Convenience Button preconfigured for use as a trigger for opening the XH options dialog.
 *
 * Can be provided an onClick handler, otherwise will call default framework handler.
 */
@HoistComponent
export class OptionsButton extends Component {

    static propTypes = {
        ...Button.propTypes
    };

    render() {
        const {icon, title, onClick, ...rest} = this.props;
        return button({
            icon: withDefault(icon, Icon.gear()),
            title: withDefault(title, 'Options'),
            onClick: withDefault(onClick, () => XH.showOptionsDialog()),
            ...rest
        });
    }
}
export const optionsButton = elemFactory(OptionsButton);