/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {ColumnHeaderModel} from '@xh/hoist/cmp/grid/impl/ColumnHeaderModel';
import {filterPopover} from '@xh/hoist/cmp/grid/impl/FilterPopover';
import {div, span} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {useOnMount} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isFunction, isString, isUndefined} from 'lodash';

/**
 * A custom ag-Grid header component.
 *
 * Relays sorting events directly to the controlling GridModel. Supports absolute value sorting
 * by checking `Column.absSort` to determine next sortBy and by rendering custom sort icons.
 *
 * @private
 */
export const columnHeader = hoistCmp.factory({
    displayName: 'ColumnHeader',
    className: 'xh-grid-header',
    model: creates(ColumnHeaderModel),

    render({model, ...props}) {
        useOnMount(() => model.init(props));

        const extraClasses = [
            model.activeGridSorter ? 'xh-grid-header-sorted' : null,
            model.hasNonPrimarySort ? 'xh-grid-header-multisort' : null
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
                sortIcon({omit: !model.activeGridSorter}),
                filterPopover({omit: !model.enableFilter})
            ]
        });
    }
});

const sortIcon = hoistCmp.factory({
    render({model}) {
        if (model.colId === 'company') {
            console.log(model.activeGridSorter);
        }
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