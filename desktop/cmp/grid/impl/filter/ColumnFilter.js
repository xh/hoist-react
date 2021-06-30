/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {div, filler} from '@xh/hoist/cmp/layout';
import {popover} from '@xh/hoist/kit/blueprint';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {buttonGroup, button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './ColumnFilter.scss';
import {ColumnFilterModel} from './ColumnFilterModel';

export const columnFilter = hoistCmp.factory({
    model: uses(ColumnFilterModel),
    render({model}) {
        const {isOpen, hasFilter} = model;
        return popover({
            isOpen,
            className: 'xh-column-filter__icon',
            popoverClassName: 'xh-popup--framed',
            position: 'bottom',
            boundary: 'viewport',
            hasBackdrop: true,
            interactionKind: 'click',
            onInteraction: (open) => {
                if (!open) model.closeMenu();
            },
            target: div({
                item: hasFilter ? Icon.filter() : Icon.bars(),
                onClick: (e) => {
                    e.stopPropagation();
                    model.openMenu();
                }
            }),
            content: content()
        });
    }
});

const content = hoistCmp.factory({
    render({model}) {
        return panel({
            title: `Filter`,
            className: 'xh-column-filter',
            compactHeader: true,
            onClick: (e) => e.stopPropagation(),
            headerItems: [switcher()],
            items: [
                tabContainer(),
                mask({
                    isDisplayed: model.showMask,
                    spinner: true
                })
            ],
            bbar: bbar()
        });
    }
});

const bbar = hoistCmp.factory({
    render({model}) {
        return toolbar({
            compact: true,
            items: [
                button({
                    icon: Icon.undo(),
                    text: 'Clear',
                    intent: 'danger',
                    disabled: !model.hasFilter,
                    onClick: () => model.clear()
                }),
                filler(),
                button({
                    text: 'Cancel',
                    onClick: () => model.closeMenu()
                }),
                button({
                    icon: Icon.check(),
                    text: 'Apply',
                    intent: 'success',
                    disabled: !model.hasFilter && !model.hasPendingFilter,
                    onClick: () => model.commit()
                })
            ]
        });
    }
});

const switcher = hoistCmp.factory(
    ({model}) => {
        const {type, disableEnumFilter} = model,
            {tabs} = model.tabContainerModel;

        return buttonGroup({
            omit: disableEnumFilter || type === 'bool',
            className: 'xh-column-filter__tab-switcher',
            items: tabs.map(it => switcherButton({...it}))
        });
    }
);

const switcherButton = hoistCmp.factory(
    ({model, id, title}) => {
        const {tabContainerModel} = model,
            {activeTabId} = tabContainerModel;

        return button({
            className: 'xh-column-filter__tab-switcher__button',
            text: title,
            active: activeTabId === id,
            intent: 'primary',
            minimal: false,
            onClick: () => tabContainerModel.activateTab(id)
        });
    }
);