/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, hoistModel} from 'hoist/core';
import {hoistApp} from 'hoist/app';
import {vframe, frame} from 'hoist/layout';
import {navbar, navbarGroup, navbarHeading, button, Intent} from 'hoist/kit/blueprint';
import {tabContainer} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import {AppModel} from './AppModel';

@hoistApp
export class App extends Component {

    static model = new AppModel();

    render() {
        return vframe({
            items: [
                this.renderNavBar(),
                frame({
                    cls: 'xh-mt xh-ml',
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
            cls: 'xh-bb',
            items: [
                navbarGroup({
                    align: 'left',
                    items: [
                        Icon.eye({size: '2x', flip: 'both'}),
                        navbarHeading(`${XH.appName} Admin`)
                    ]
                }),
                navbarGroup({
                    align: 'right',
                    items: [
                        button({
                            icon: Icon.mail(),
                            text: 'Contact',
                            cls: 'xh-mr',
                            onClick: this.onContactClick
                        }),
                        button({
                            icon: this.darkTheme ? Icon.sun() : Icon.moon(),
                            cls: 'xh-mr',
                            onClick: this.onThemeToggleClick
                        }),
                        button({
                            icon: Icon.refresh(),
                            intent: Intent.SUCCESS,
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

    onThemeToggleClick = () => {
        hoistModel.toggleTheme();
    }

    onRefreshClick = () => {
        XH.appModel.requestRefresh();
    }
}
