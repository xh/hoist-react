/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {div, filler} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp, uses} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {stopPropagation} from '@xh/hoist/utils/js';
import './ColumnHeaderFilter.scss';
import {ColumnHeaderFilterModel} from './ColumnHeaderFilterModel';

/**
 * Component to manage column filters from header. Will appear as a "filter" icon if filters are
 * present and provides an appropriate dialog UI for managing the filters when clicked.
 *
 * @private
 */
export const columnHeaderFilter = hoistCmp.factory({
    model: uses(ColumnHeaderFilterModel),

    /** @param {ColumnHeaderFilterModel} model */
    render({model}) {
        const {isOpen, hasFilter} = model;
        return popover({
            isOpen,
            className: 'xh-column-header-filter__icon',
            popoverClassName: 'xh-popup--framed',
            position: 'right-top',
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

const bbar = hoistCmp.factory({
    render({model}) {
        const {commitOnChange} = model;
        return toolbar(
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
        );
    }
});

const switcher = hoistCmp.factory(
    ({model}) => {
        const {fieldType, enableValues} = model.fieldSpec,
            {tabs} = model.tabContainerModel;

        return buttonGroup({
            omit: !enableValues || fieldType === FieldType.BOOL,
            className: 'xh-column-header-filter__tab-switcher',
            items: tabs.map(it => switcherButton({...it}))
        });
    }
);

const switcherButton = hoistCmp.factory(
    ({model, id, title}) => {
        const {tabContainerModel} = model,
            {activeTabId} = tabContainerModel;

        return button({
            className: 'xh-column-header-filter__tab-switcher__button',
            text: title,
            active: activeTabId === id,
            outlined: true,
            onClick: () => tabContainerModel.activateTab(id)
        });
    }
);
