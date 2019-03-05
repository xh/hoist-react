/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {tabSwitcher} from '@xh/hoist/desktop/cmp/tab';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {appBar, appBarSeparator} from '@xh/hoist/desktop/cmp/appbar';
import {ContextMenuItem, ContextMenuSupport} from '@xh/hoist/desktop/cmp/contextmenu';

import './App.scss';

@HoistComponent
@ContextMenuSupport
export class App extends Component {

    render() {
        return panel({
            tbar: this.renderAppBar(),
            className: 'xh-admin-app-frame',
            item: tabContainer({model: this.model.tabModel})
        });
    }

    getContextMenuItems() {
        const Item = ContextMenuItem;
        return [Item.reloadApp(), Item.about(), Item.logout()];
    }

    //------------------
    // Implementation
    //------------------
    renderAppBar() {
        return appBar({
            icon: Icon.gears({size: '2x', prefix: 'fal'}),
            leftItems: [
                tabSwitcher({model: this.model.tabModel})
            ],
            rightItems: [
                button({
                    icon: Icon.mail(),
                    text: 'Contact',
                    onClick: () => window.open('https://xh.io/contact')
                }),
                button({
                    icon: Icon.openExternal(),
                    title: 'Open app...',
                    onClick: () => window.open('/')
                }),
                appBarSeparator()
            ],
            appMenuButtonOptions: {
                hideAdminItem: true,
                hideFeedbackItem: true
            }
        });
    }

}