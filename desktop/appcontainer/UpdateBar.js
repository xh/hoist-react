/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import './UpdateBar.scss';
import {AppContainerModel} from '@xh/hoist/core/appcontainer/AppContainerModel';

/**
 * @private
 */
@HoistComponent
export class UpdateBar extends Component {

    static modelClass = AppContainerModel;

    render() {
        const {updateVersion} = this.model,
            className = 'xh-update-bar';

        if (!updateVersion) return null;

        return toolbar({
            className,
            items: [
                Icon.rocket({size: 'lg'}),
                div('An application update is available!'),
                button({
                    icon: Icon.refresh(),
                    intent: 'primary',
                    small: true,
                    text: `Update to ${updateVersion}`,
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
