/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, elemFactory, HoistComponent} from 'hoist/core';
import {toolbar} from 'hoist/cmp/toolbar';
import {div} from 'hoist/cmp/layout';
import {button} from 'hoist/kit/blueprint';
import {Icon} from 'hoist/icon';
import './UpdateBar.scss';

@HoistComponent()
export class UpdateBar extends Component {

    render() {
        const {updateVersion} = XH,
            cls = 'xh-update-bar';

        if (!updateVersion) return null;

        return toolbar({
            cls,
            items: [
                Icon.rocket({size: 'lg'}),
                div('An application update is available!'),
                button({
                    icon: Icon.refresh(),
                    intent: 'primary',
                    cls: 'pt-small',
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
