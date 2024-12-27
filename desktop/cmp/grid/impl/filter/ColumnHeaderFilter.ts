/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {div, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import './ColumnHeaderFilter.scss';
import classNames from 'classnames';
import {ColumnHeaderFilterModel} from './ColumnHeaderFilterModel';
import {headerFilter} from './headerfilter/HeaderFilter';

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
            hasBackdrop: true,
            interactionKind: 'click',
            onInteraction: open => {
                if (!open) model.close();
            },
            item: div({
                item: hasFilter ? Icon.filter() : Icon.columnMenu(),
                onClick: e => {
                    e.stopPropagation();
                    model.open();
                }
            }),
            targetTagName: 'div',
            // Force unmount on close
            content: isOpen ? headerFilter() : span()
        });
    }
});
