/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useLocalModel, XH} from '@xh/hoist/core';
import {div, span} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import {isFunction, isString, isUndefined} from 'lodash';

import {FilterColumnHeaderModel} from './FilterColumnHeaderModel';
import {filterPopover} from '../popover/FilterPopover';

/**
 * A custom ag-Grid header component.
 *
 * Relays sorting events directly to the controlling GridModel. Supports absolute value sorting
 * by checking `Column.absSort` to determine next sortBy and by rendering custom sort icons.
 *
 * Supports column level filtering with `Column.enableFilter`
 *
 * @private
 */
export const filterColumnHeader = hoistCmp.factory({
    displayName: 'FilterColumnHeader',
    className: 'xh-grid-header',

    render(props) {
        // Needs to be local model to get initial props.
        const model = useLocalModel(() => new FilterColumnHeaderModel(props));

        const extraClasses = [
            model.activeGridSorter ? 'xh-grid-header-sorted' : null,
            model.hasNonPrimarySort ? 'xh-grid-header-multisort' : null,
            model.enableFilter ? 'xh-grid-header-filter-enabled' : null
        ];

        const {xhColumn, gridModel} = model,
            {isDesktop} = XH;

        // `props.displayName` is the output of the Column `headerValueGetter` and should always be a string
        // If `xhColumn` is present, it can consulted for a richer `headerName`
        let headerElem = props.displayName;
        if (xhColumn) {
            headerElem = isFunction(xhColumn.headerName) ?
                xhColumn.headerName({column: xhColumn, gridModel}) :
                xhColumn.headerName;
        }

        // If no app tooltip dynamically toggle a tooltip to display elided header
        let onMouseEnter = null;
        if (isDesktop && isUndefined(xhColumn?.headerTooltip)) {
            onMouseEnter = ({target: el}) => {
                if (el.offsetWidth < el.scrollWidth) {
                    const title = isString(headerElem) ? headerElem : props.displayName;
                    el.setAttribute('title', title);
                } else {
                    el.removeAttribute('title');
                }
            };
        }

        return div({
            className:      classNames(props.className, extraClasses),
            onClick:        isDesktop  ? model.onClick : null,
            onDoubleClick:  isDesktop  ? model.onDoubleClick : null,
            onMouseDown:    isDesktop  ? model.onMouseDown : null,
            onTouchStart:   !isDesktop ? model.onTouchStart : null,
            onTouchEnd:     !isDesktop ? model.onTouchEnd : null,

            items: [
                span({onMouseEnter, item: headerElem}),
                sortIcon({model, omit: !model.activeGridSorter}),
                filterPopover({model: model.filterPopoverModel, omit: !model.filterPopoverModel})
            ]
        });
    }
});

const sortIcon = hoistCmp.factory({
    render({model}) {
        const {abs, sort} = model.activeGridSorter;
        if (!sort) return null;

        let icon;
        if (sort === 'asc') {
            icon = abs ? Icon.arrowToTop({size: 'sm'}) : Icon.arrowUp({size: 'sm'});
        } else if (sort === 'desc') {
            icon = abs ? Icon.arrowToBottom({size: 'sm'}) : Icon.arrowDown({size: 'sm'});
        }
        return div({className: 'xh-grid-header-sort-icon', item: icon});
    }
});