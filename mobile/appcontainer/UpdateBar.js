/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {div, filler} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import './UpdateBar.scss';

/**
 * @private
 */
@HoistComponent
export class UpdateBar extends Component {

    render() {
        const {updateVersion} = this.model;

        if (!updateVersion) return null;

        return div({
            className: 'xh-update-bar',
            items: [
                Icon.rocket({size: 'lg'}),
                div('An update is available!'),
                filler(),
                button({
                    icon: Icon.refresh(),
                    text: updateVersion,
                    onClick: this.reloadApp
                })
            ]
        });
    }

    reloadApp() {
        XH.reloadApp();
    }

}
export const updateBar = elemFactory(UpdateBar);
