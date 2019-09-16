/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp, uses} from '@xh/hoist/core';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {tabSwitcher} from '@xh/hoist/desktop/cmp/tab';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {appBar, appBarSeparator} from '@xh/hoist/desktop/cmp/appbar';
import {ContextMenuItem as CM} from '@xh/hoist/desktop/cmp/contextmenu';

import {AppModel} from './AppModel';

import './App.scss';

export const App = hoistCmp({
    displayName: 'App',
    model: uses(AppModel),

    render() {
        return panel({
            tbar: tbar(),
            contextMenu: [CM.reloadApp(), CM.about(), CM.logout()],
            className: 'xh-admin-app-frame',
            item: tabContainer()
        });
    }
});


const tbar = hoistCmp.factory(
    () => appBar({
        icon: Icon.gears({size: '2x', prefix: 'fal'}),
        leftItems: [
            tabSwitcher()
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
    })
);