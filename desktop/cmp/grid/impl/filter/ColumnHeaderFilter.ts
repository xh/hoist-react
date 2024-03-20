/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {div, filler} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {stopPropagation} from '@xh/hoist/utils/js';
import './ColumnHeaderFilter.scss';
import classNames from 'classnames';
import {ColumnHeaderFilterModel} from './ColumnHeaderFilterModel';

/**
 * Component to manage column filters from header. Will appear as a "filter" icon if filters are
 * present and provides an appropriate dialog UI for managing the filters when clicked.
 *
 * @internal
 */
export const columnHeaderFilter = hoistCmp.factory({
    model: uses(ColumnHeaderFilterModel),

    render({model}) {
        const {isOpen, hasFilter} = model;
        return popover({
            isOpen,
            className: classNames(
                'xh-column-header-filter__icon',
                isOpen ? 'xh-column-header-filter__icon--open' : null,
                hasFilter ? 'xh-column-header-filter__icon--active' : null
            ),
            popoverClassName: 'xh-popup--framed',
            position: 'right-top',
            boundary: 'viewport',
            hasBackdrop: true,
            interactionKind: 'click',
            onInteraction: open => {
                if (!open) model.closeMenu();
            },
            item: div({
                item: hasFilter ? Icon.filter() : Icon.columnMenu(),
                onClick: e => {
                    e.stopPropagation();
                    model.openMenu();
                }
            }),
            targetTagName: 'div',
            content: content()
        });
    }
});

const content = hoistCmp.factory({
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

const bbar = hoistCmp.factory<ColumnHeaderFilterModel>({
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

const switcher = hoistCmp.factory<ColumnHeaderFilterModel>(({model}) => {
    const {fieldType, enableValues} = model.fieldSpec,
        {tabs} = model.tabContainerModel;

    return buttonGroup({
        omit: !enableValues || fieldType === 'bool',
        className: 'xh-column-header-filter__tab-switcher',
        items: tabs.map(it => switcherButton({...it}))
    });
});

const switcherButton = hoistCmp.factory<ColumnHeaderFilterModel>(({model, id, title}) => {
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
