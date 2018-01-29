/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, elem, hoistApp} from 'hoist';
import {vbox, hbox, box, div, filler, spacer} from 'hoist/layout';
import {button, icon} from 'hoist/kit/blueprint';
import {observer} from 'hoist/mobx';

import {TabContainer} from './tabs/TabContainer';
import {appModel} from './AppModel';

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
                    items: elem(TabContainer, {model: appModel.tabs})
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
                button({iconName: 'refresh', onClick: appModel.requestRefresh})
            ]
        });
    }
}

