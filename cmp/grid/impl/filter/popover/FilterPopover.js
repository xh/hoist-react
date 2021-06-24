/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {div, filler} from '@xh/hoist/cmp/layout';
import {popover} from '@xh/hoist/kit/blueprint';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {buttonGroup, button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './FilterPopover.scss';

export const filterPopover = hoistCmp.factory({
    render({model}) {
        const {isOpen, hasFilter} = model;
        return popover({
            isOpen,
            className: 'xh-filter-popover__icon',
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
    render() {
        return panel({
            title: `Filter`,
            className: 'xh-filter-popover',
            compactHeader: true,
            onClick: (e) => e.stopPropagation(),
            headerItems: [switcher()],
            item: tabContainer(),
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
            className: 'xh-filter-popover__tab-switcher',
            items: tabs.map(it => switcherButton({...it}))
        });
    }
);

const switcherButton = hoistCmp.factory(
    ({model, id, title}) => {
        const {tabContainerModel} = model,
            {activeTabId} = tabContainerModel;

        return button({
            className: 'xh-filter-popover__tab-switcher__button',
            text: title,
            active: activeTabId === id,
            intent: 'primary',
            minimal: false,
            onClick: () => tabContainerModel.activateTab(id)
        });
    }
);