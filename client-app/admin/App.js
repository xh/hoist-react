/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, hoistApp, hoistAppModel} from 'hoist';
import {vframe, hbox, frame, div, filler, spacer} from 'hoist/layout';
import {navbar, navbarGroup, navbarHeading, button, icon, Intent} from 'hoist/kit/blueprint';
import {button as semanticButton, icon as semanticIcon} from 'hoist/kit/semantic';
import {observer} from 'hoist/mobx';
import {tabContainer} from 'hoist/cmp/tab';
import {appModel} from './AppModel';

@hoistApp
@observer
export class App extends Component {

    render() {
        return vframe({
            cls: hoistAppModel.darkTheme ? 'xh-dark' : '',
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
        return hoistAppModel.useSemantic ? this.suiNavBar() : this.bpNavBar();
    }

    suiNavBar() {
        return hbox({
            padding: 5,
            height: 50,
            flex: 'none',
            cls: 'xh-app-nav-bar',
            alignItems: 'center',
            items: [
                semanticIcon({name: 'eye'}),
                spacer({width: 10}),
                div(`${XH.appName} Admin`),
                filler(),
                semanticButton({
                    icon: 'refresh',
                    size: 'small',
                    compact: true,
                    onClick: this.onRefreshClick
                })
            ]
        });
    }

    bpNavBar() {
        return navbar({
            cls: 'xh-bb',
            items: [
                navbarGroup({
                    align: 'left',
                    items: [
                        icon({icon: 'eye-open', iconSize: 20}),
                        navbarHeading(`${XH.appName} Admin`)
                    ]
                }),
                navbarGroup({
                    align: 'right',
                    items: [
                        button({
                            icon: 'envelope',
                            text: 'Contact',
                            cls: 'xh-mr',
                            onClick: this.onContactClick
                        }),
                        button({
                            icon: hoistAppModel.darkTheme ? 'flash' : 'moon',
                            cls: 'xh-mr',
                            onClick: this.onThemeToggleClick
                        }),
                        button({
                            icon: 'refresh',
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
        hoistAppModel.toggleTheme();
    }

    onRefreshClick = () => {
        appModel.requestRefresh();
    }

}
