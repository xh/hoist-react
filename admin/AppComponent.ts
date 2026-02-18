/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
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

export const AppComponent = hoistCmp({
    displayName: 'App',
    model: uses(AppModel),

    render() {
        return panel({
            tbar: tbar(),
            className: 'xh-admin-app',
            item: tabContainer({
                switcher: false,
                childContainerProps: ({tabId}) => ({
                    switcher: {
                        orientation: 'left',
                        testId: `${tabId}-tab-switcher`
                    }
                })
            })
        });
    }
});

const tbar = hoistCmp.factory<AppModel>(({model}) => {
    const primaryApp = model.getPrimaryAppCode();
    return appBar({
        icon: Icon.gears({size: '2x', prefix: 'fal'}),
        leftItems: [tabSwitcher({testId: 'tab-switcher', enableOverflow: true})],
        rightItems: [
            button({
                icon: Icon.openExternal(),
                tooltip: `Open ${primaryApp}...`,
                omit: !primaryApp,
                onClick: () => model.openPrimaryApp()
            }),
            appBarSeparator({omit: !primaryApp})
        ],
        appMenuButtonProps: {
            hideAdminItem: true,
            hideFeedbackItem: true,
            extraItems: model.getAppMenuButtonExtraItems()
        }
    });
});
