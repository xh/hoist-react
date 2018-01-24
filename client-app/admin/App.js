/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import './App.css';

import {Component} from 'react';
import {XH, elem, hoistApp} from 'hoist';
import {vbox, hbox, box, div, filler, spacer} from 'hoist/layout';
import {button, tabs, tab, icon} from 'hoist/blueprint';
import {observer} from 'hoist/mobx';

import {Tab} from './tabs/Tab';
import {TabSetStore} from './tabs/TabSetStore';
import {appStore} from './AppStore';


@hoistApp
@observer
export class App extends Component {

    render() {
        return vbox({
            flex: 1,
            items: [
                this.renderNavBar(),
                box({
                    padding: 5,
                    flex: 1,
                    items: this.renderTabs(appStore.tabs)
                })
            ]
        });
    }

    //------------------
    // Implementation
    //------------------
    renderNavBar() {
        return hbox({
            padding: 5,
            height: 50,
            style: {
                fontSize: 20,
                color: 'white',
                backgroundColor: 'black'
            },
            alignItems: 'center',
            items: [
                icon({iconName: 'eye-open'}),
                spacer({width: 10}),
                div(`${XH.appName} Admin`),
                filler(),
                button({iconName: 'refresh', onClick: appStore.requestRefresh})
            ]
        });
    }

    renderTabs(store) {
        return tabs({
            id: store.id,
            onChange: store.changeTab,
            selectedTabId: store.selectedTabId,
            vertical: store.orientation === 'v',
            items: store.children.map(child => {
                const panel = child instanceof TabSetStore ? this.renderTabs(child) : elem(Tab, {store: child});
                return tab({id: child.id, title: child.id, panel});
            })
        });
    }
}

