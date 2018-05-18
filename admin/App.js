/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {navbar, navbarGroup, navbarHeading, button} from 'hoist/kit/blueprint';
import {XH, HoistComponent} from 'hoist/core';
import {lockoutPanel} from 'hoist/app';
import {tabContainer} from 'hoist/cmp/tab';
import {frame, panel} from 'hoist/cmp/layout';
import {logoutButton, themeToggleButton, refreshButton} from 'hoist/cmp/button';
import {Icon} from 'hoist/icon';

import './App.scss';

@HoistComponent()
export class App extends Component {
    render() {
        if (!XH.getUser().isHoistAdmin) {
            return lockoutPanel({message: 'Access to this area requires administrator permissions.'});
        }

        return panel({
            tbar: this.renderNavBar(),
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