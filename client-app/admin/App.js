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
import {button, tabs2, tab2, icon} from 'hoist/blueprint';
import {observer} from 'hoist/mobx';

import {appStore} from './AppStore';
import {UserPanel} from './tabs/users/UserPanel';
import {ServicePanel} from './tabs/services/ServicePanel';

@hoistApp
@observer
export class App extends Component {

    tabs = [UserPanel, ServicePanel];

    render() {
        return vbox({
            flex: 1,
            items: [
                this.renderNavBar(),
                this.renderTabs()
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
                div({items: `${XH.appName} Admin`}),
                filler(),
                button({iconName: 'refresh', onClick: appStore.requestRefresh})
            ]
        });
    }

    renderTabs() {
        return box({
            padding: 5,
            flex: 1,
            items: tabs2({
                selectedTabId: appStore.activeTabId,
                onChange: appStore.changeTab,
                items: this.tabs.map(C => {
                    return tab2({title: C.tabLabel, id: C.tabId, panel: elem(C)});
                })
            })
        });
    }
}
