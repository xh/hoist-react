/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {TabContainerModel, TabSwitcherProps} from '@xh/hoist/cmp/tab';
import {elementFactory, hoistCmp, uses} from '@xh/hoist/core';
import '@xh/hoist/mobile/register';
import {getTestId, TEST_ID} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import './Tabs.scss';

/**
 * Switcher for the mobile TabContainer: a row of buttons, one per tab, docked above or below the
 * tab content. Tabs with `excludeFromSwitcher` are left out.
 *
 * @internal
 */
export const tabSwitcher = hoistCmp.factory<TabSwitcherProps>({
    displayName: 'TabSwitcher',
    className: 'xh-tab-switcher',
    model: uses(TabContainerModel),

    render({model, className, orientation, testId}) {
        const {activeTabId} = model,
            tabs = model.tabs.filter(it => !it.excludeFromSwitcher);

        return div({
            className: classNames(className, `xh-tab-switcher--${orientation}`),
            [TEST_ID]: testId,
            items: tabs.map(({id, title, icon, disabled}) =>
                buttonEl({
                    key: id,
                    type: 'button',
                    className: classNames('xh-tab', id === activeTabId ? 'xh-tab--active' : null),
                    disabled,
                    [TEST_ID]: getTestId(testId, id),
                    onClick: () => model.setActiveTabId(id),
                    items: [icon, div({className: 'xh-tab__label', item: title, omit: !title})]
                })
            )
        });
    }
});

const buttonEl = elementFactory('button');
