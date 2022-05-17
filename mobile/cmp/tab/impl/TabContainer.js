/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, useLocalModel, XH} from '@xh/hoist/core';
import {div, placeholder} from '@xh/hoist/cmp/layout';
import {tab as onsenTab, tabbar as onsenTabbar, page} from '@xh/hoist/kit/onsen';
import {throwIf, debounced} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import classNames from 'classnames';
import './Tabs.scss';
import {tab} from './Tab';

/**
 * Mobile Implementation of TabContainer.
 *
 * @private
 */
export function tabContainerImpl({model, className}) {
    const {activeTab, switcher} = model,
        tabs = model.tabs.filter(it => !it.excludeFromSwitcher),
        impl = useLocalModel(LocalModel);

    throwIf(
        switcher && !['top', 'bottom'].includes(switcher?.orientation),
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
        index: activeTab ? tabs.indexOf(activeTab) : 0,
        renderTabs: (idx, ref) => {
            impl.setSwiper(ref);
            return tabs.map(renderTabModel);
        },
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
                icon,
                div({className: 'xh-tab__label', item: title, omit: !title})
            ]
        })
    };
}

class LocalModel extends HoistModel {

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
