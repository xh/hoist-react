/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {div, placeholder} from '@xh/hoist/cmp/layout';
import {HoistModel, useLocalModel, XH} from '@xh/hoist/core';
import {page, tab as onsenTab, tabbar as onsenTabbar} from '@xh/hoist/kit/onsen';
import '@xh/hoist/mobile/register';
import {debounced, throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isEmpty} from 'lodash';
import {tab} from './Tab';
import './Tabs.scss';
import {TabContainerProps, TabModel} from '@xh/hoist/cmp/tab';

/**
 * Mobile Implementation of TabContainer.
 *
 * @internal
 */
export function tabContainerImpl({model, className}: TabContainerProps) {
    const {activeTab, switcher} = model,
        tabs = model.tabs.filter(it => !it.excludeFromSwitcher),
        impl = useLocalModel(TabContainerLocalModel);

    throwIf(
        switcher && !['top', 'bottom'].includes(switcher.orientation),
        "Mobile TabContainer tab switcher orientation must be 'top', or 'bottom'"
    );

    if (isEmpty(tabs)) {
        return page({
            className: 'xh-tab-page',
            item: placeholder(model.emptyText)
        });
    }

    return onsenTabbar({
        className: classNames(className, `xh-tab-container--${switcher?.orientation}`),
        position: switcher?.orientation,
        activeIndex: activeTab ? tabs.indexOf(activeTab) : 0,
        renderTabs: (idx, ref) => {
            impl.setSwiper(ref);
            return tabs.map(renderTabModel);
        },
        onPreChange: e => model.activateTab(tabs[e.index].id),
        hideTabs: !switcher,
        ...switcher
    });
}

function renderTabModel(tabModel: TabModel) {
    const {id, title, icon} = tabModel;

    return {
        content: tab({key: id, model: tabModel}),
        tab: onsenTab({
            key: id,
            className: 'xh-tab',
            items: [icon, div({className: 'xh-tab__label', item: title, omit: !title})]
        })
    };
}

class TabContainerLocalModel extends HoistModel {
    override xhImpl = true;

    swiper;

    // Due to currently unknown reasons, this event handler sometimes gets removed. See: #2842
    constructor() {
        super();
        this.addReaction({
            track: () => XH.isPortrait,
            run: () => this.swiper?.onResize()
        });
    }

    // Capture a reference to the underlying Onsen Swiper from the Tabbar ref.
    // We must debounce as the first time this method is called the Tabbar's constructor has not completed.
    @debounced(1)
    setSwiper(ref) {
        if (this.swiper) return;
        this.swiper = ref?._tabbar?._swiper;
    }
}
