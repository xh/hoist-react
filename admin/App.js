/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent} from 'hoist/core';
import {frame} from 'hoist/layout';
import {navbar, navbarGroup, navbarHeading, button} from 'hoist/kit/blueprint';
import {logoutButton, lockoutPanel, panel, tabContainer, themeToggleButton, refreshButton} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import './App.scss';

@HoistComponent()
export class App extends Component {
    render() {
        if (!XH.identityService.user.isHoistAdmin) {
            return lockoutPanel({message: 'Access to this area requires administrator permissions.'});
        }

        return panel({
            topToolbar: this.renderNavBar(),
            item: frame({
                cls: 'xh-admin-app-frame',
                item: tabContainer({model: XH.appModel.tabs})
            })
        });
    }

    //------------------
    // Implementation
    //------------------
    renderNavBar() {
        return navbar({
            items: [
                navbarGroup({
                    align: 'left',
                    items: [
                        Icon.gears({size: '2x'}),
                        navbarHeading(`${XH.appName} Admin`)
                    ]
                }),
                navbarGroup({
                    align: 'right',
                    items: [
                        button({
                            icon: Icon.mail(),
                            text: 'Contact',
                            onClick: this.onContactClick
                        }),
                        button({
                            icon: Icon.openExternal(),
                            title: 'Open app...',
                            onClick: this.onOpenAppClick
                        }),
                        themeToggleButton(),
                        logoutButton(),
                        refreshButton({
                            intent: 'success',
                            onClick: this.onRefreshClick
                        })
                    ]
                })
            ]
        });
    }

    onContactClick = () => {
        window.open('https://xh.io/contact');
    }

    onOpenAppClick = () => {
        window.open('/app');
    }

    onRefreshClick = () => {
        XH.appModel.requestRefresh();
    }
}