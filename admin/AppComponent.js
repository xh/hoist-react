/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, XH} from '@xh/hoist/core';
import {lockoutPanel} from '@xh/hoist/desktop/impl';
import {tabContainer, tabSwitcher} from '@xh/hoist/desktop/cmp/tab';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {appBar} from '@xh/hoist/desktop/cmp/appbar';

import './App.scss';

@HoistComponent()
export class AppComponent extends Component {
    render() {
        if (!XH.getUser().isHoistAdmin) {
            return lockoutPanel({message: 'Access to this area requires administrator permissions.'});
        }

        return panel({
            tbar: this.renderAppBar(),
            cls: 'xh-admin-app-frame',
            item: tabContainer({
                model: this.model.tabModel,
                switcherPosition: 'none'
            })
        });
    }

    //------------------
    // Implementation
    //------------------
    renderAppBar() {
        return appBar({
            icon: Icon.gears({size: '2x', prefix: 'fal'}),
            title: `${XH.appName} Admin`,
            leftItems: [
                tabSwitcher({model: this.model.tabModel})
            ],
            rightItems: [
                button({
                    icon: Icon.mail(),
                    text: 'Contact',
                    onClick: this.onContactClick
                }),
                button({
                    icon: Icon.openExternal(),
                    title: 'Open app...',
                    onClick: this.onOpenAppClick
                })
            ],
            hideAdminButton: true,
            hideFeedbackButton: true,
            refreshButtonProps: {
                onClick: this.onRefreshClick
            }
        });
    }

    onContactClick = () => {
        window.open('https://xh.io/contact');
    };

    onOpenAppClick = () => {
        window.open('/app');
    };

    onRefreshClick = () => {
        XH.app.requestRefresh();
    };
}