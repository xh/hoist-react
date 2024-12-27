/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {filler} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {stopPropagation} from '@xh/hoist/utils/js';
import {HeaderFilterModel} from './HeaderFilterModel';

/**
 * Pop-up panel to display column specific filters
 *
 * @internal
 */
export const headerFilter = hoistCmp.factory({
    model: creates(HeaderFilterModel),
    render() {
        return panel({
            title: `Filter`,
            className: 'xh-column-header-filter',
            compactHeader: true,
            onClick: stopPropagation,
            onDoubleClick: stopPropagation,
            headerItems: [switcher()],
            item: tabContainer(),
            bbar: bbar()
        });
    }
});

const bbar = hoistCmp.factory<HeaderFilterModel>({
    render({model}) {
        const {commitOnChange} = model;
        return toolbar({
            compact: true,
            items: [
                filler(),
                button({
                    icon: Icon.delete(),
                    text: 'Clear Filter',
                    intent: 'danger',
                    disabled: !model.hasFilter,
                    onClick: () => model.clear()
                }),
                button({
                    omit: commitOnChange,
                    icon: Icon.check(),
                    text: 'Apply Filter',
                    intent: 'success',
                    disabled: !model.hasFilter && !model.hasPendingFilter,
                    onClick: () => model.commit()
                })
            ]
        });
    }
});

const switcher = hoistCmp.factory<HeaderFilterModel>(({model}) => {
    const {fieldType, enableValues} = model.fieldSpec,
        {tabs} = model.tabContainerModel;

    return buttonGroup({
        omit: !enableValues || fieldType === 'bool',
        className: 'xh-column-header-filter__tab-switcher',
        items: tabs.map(it => switcherButton({...it}))
    });
});

const switcherButton = hoistCmp.factory<HeaderFilterModel>(({model, id, title}) => {
    const {tabContainerModel} = model,
        {activeTabId} = tabContainerModel;

    return button({
        className: 'xh-column-header-filter__tab-switcher__button',
        text: title,
        active: activeTabId === id,
        outlined: true,
        onClick: () => tabContainerModel.activateTab(id)
    });
});
