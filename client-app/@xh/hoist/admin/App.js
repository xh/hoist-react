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

import {appModel} from './AppModel';

import {glyph, Glyph} from 'hoist/utils/Glyph';

@hoistApp
export class App extends Component {

    render() {
        return vframe({
            cls: this.darkTheme ? 'xh-dark' : '',
            items: [
                this.renderNavBar(),
                frame({
                    cls: 'xh-mt xh-ml',
                    item: tabContainer({model: appModel.tabs})
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
                        glyph({icon: Glyph.EYE}),
                        navbarHeading(`${XH.appName} Admin`)
                    ]
                }),
                navbarGroup({
                    align: 'right',
                    items: [
                        button({
                            icon: glyph({icon: Glyph.ENVELOPE}),
                            text: 'Contact',
                            cls: 'xh-mr',
                            onClick: this.onContactClick
                        }),
                        button({
                            icon: glyph({icon: this.darkTheme ? Glyph.SUN : Glyph.MOON}),
                            cls: 'xh-mr',
                            onClick: this.onThemeToggleClick
                        }),
                        button({
                            icon: glyph({icon: Glyph.REFRESH}),
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
        appModel.requestRefresh();
    }
}
