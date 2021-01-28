/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {div, frame} from '@xh/hoist/cmp/layout';
import {tab as onsenTab, tabbar} from '@xh/hoist/kit/onsen';
import {throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {tab} from './Tab';
import {isEmpty} from 'lodash';
import {page} from '@xh/hoist/kit/onsen';

import './Tabs.scss';

/**
 * Mobile Implementation of TabContainer.
 *
 * @private
 */
export function tabContainerImpl({model, className, ...props}) {
    const {activeTab, switcher} = model,
        tabs = model.tabs.filter(it => !it.excludeFromSwitcher);

    throwIf(
        switcher && !['top', 'bottom'].includes(switcher?.orientation),
        "Mobile TabContainer tab switcher orientation must be 'top', or 'bottom'"
    );

    if (isEmpty(tabs)) {
        return page({
            className: 'xh-tab-page',
            item: frame({
                alignItems: 'center',
                justifyContent: 'center',
                item: model.emptyText
            })
        });
    }
    return tabbar({
        className: classNames(className, `xh-tab-container--${switcher?.orientation}`),
        position: switcher?.orientation,
        index: activeTab ? tabs.indexOf(activeTab) : 0,
        renderTabs: () => tabs.map(renderTabModel),
        onPreChange: (e) => model.activateTab(tabs[e.index].id),
        visible: !!switcher,
        ...switcher
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
