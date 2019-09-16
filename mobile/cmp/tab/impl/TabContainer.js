/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {div} from '@xh/hoist/cmp/layout';
import {tab as onsenTab, tabbar} from '@xh/hoist/kit/onsen';
import {throwIf} from '@xh/hoist/utils/js';
import {tab} from './Tab';
import classNames from 'classnames';

import './Tabs.scss';

/**
 * Mobile Implementation of TabContainer.
 *
 * @private
 */
export function tabContainerImpl({model, ...props}) {
    throwIf(
        !['top', 'bottom', 'none'].includes(model.switcherPosition),
        "Mobile TabContainer tab switcher position must be 'none', 'top', or 'bottom'"
    );

    const {activeTab, switcherPosition} = model,
        tabs = model.tabs.filter(it => !it.excludeFromSwitcher);

    // TODO:  This should use the standard TabContainer className.
    return tabbar({
        className: classNames('xh-tabbar', props, `xh-tabbar-${switcherPosition}`),
        position: switcherPosition,
        index: activeTab ? tabs.indexOf(activeTab) : 0,
        renderTabs: () => tabs.map(renderTabModel),
        onPreChange: (e) => model.activateTab(tabs[e.index].id),
        visible: switcherPosition !== 'none'
    });
}

function renderTabModel(tabModel) {
    const {id, title, icon} = tabModel;

    return {
        content: tab({key: id, model: tabModel}),
        tab: onsenTab({
            key: id,
            className: 'xh-tab',
            items: [
                div({className: 'xh-tab-icon', item: icon, omit: !icon}),
                div({className: 'xh-tab-label', item: title})
            ]
        })
    };
}
