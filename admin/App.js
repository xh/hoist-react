/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp, uses} from '@xh/hoist/core';
import {appBar, appBarSeparator} from '@xh/hoist/desktop/cmp/appbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {tabSwitcher} from '@xh/hoist/desktop/cmp/tab';
import {Icon} from '@xh/hoist/icon';
import './App.scss';
import {AppModel} from './AppModel';

export const App = hoistCmp({
    displayName: 'App',
    model: uses(AppModel),

    render({model}) {
        return panel({
            tbar: tbar(),
            className: 'xh-admin-app-frame',
            item: tabContainer({model: model.tabModel})
        });
    }
});


const tbar = hoistCmp.factory(
    () => appBar({
        icon: Icon.gears({size: '2x', prefix: 'fal'}),
        leftItems: [
            tabSwitcher({enableOverflow: true})
        ],
        rightItems: [
            button({
                icon: Icon.openExternal(),
                title: 'Open app...',
                onClick: () => window.open('/')
            }),
            appBarSeparator()
        ],
        appMenuButtonProps: {
            hideAdminItem: true,
            hideFeedbackItem: true
        }
    })
);
