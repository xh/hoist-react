/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elemFactory, hoistComponent} from 'hoist/core';
import {vframe, frame} from 'hoist/layout';
import {navbar, navbarGroup, navbarHeading, button} from 'hoist/kit/blueprint';
import {logoutButton, lockoutPanel, tabContainer, themeToggleButton} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import './App.scss';

@hoistComponent()
export class App extends Component {
    render() {
        if (!XH.identityService.user.isHoistAdmin) {
            return lockoutPanel({message: 'Access to this area requires administrator permissions.'});
        }
        
        return vframe({
            items: [
                this.renderNavBar(),
                frame({
                    cls: 'xh-admin-app-frame',
                    item: tabContainer({model: XH.appModel.tabs})
                })
            ]
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
                        themeToggleButton(),
                        logoutButton({intent: 'danger'}),
                        button({
                            icon: Icon.refresh(),
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

    onRefreshClick = () => {
        XH.appModel.requestRefresh();
    }
}
export const app = elemFactory(App);