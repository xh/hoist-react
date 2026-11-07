/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ColumnGroup, GridModel} from '@xh/hoist/cmp/grid';
import {div, span} from '@xh/hoist/cmp/layout';
import type {HoistProps} from '@xh/hoist/core';
import {XH, hoistCmp, HoistModel, creates} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import classNames from 'classnames';
import {isFunction, isString, isUndefined} from 'lodash';
import type {ReactNode} from 'react';

import type {AgProvidedColumnGroup, IHeaderGroupParams} from '@xh/hoist/kit/ag-grid';

export interface ColumnGroupHeaderProps
    extends HoistProps<ColumnGroupHeaderModel>, IHeaderGroupParams {
    gridModel: GridModel;
    xhColumnGroup: ColumnGroup;
}

/**
 * A custom ag-Grid group header component.
 *
 * @internal
 */
export const columnGroupHeader = hoistCmp.factory<ColumnGroupHeaderProps>({
    displayName: 'ColumnGroupHeader',
    className: 'xh-grid-group-header',
    model: creates(() => ColumnGroupHeaderModel),

    render({model, className, xhColumnGroup, gridModel, setExpanded, displayName}) {
        const {isExpandable, isExpanded} = model;
        const expandIcon = () => {
            if (!isExpandable) return null;

            // Shows open or closed state, as tree rows do.
            const icon = isExpanded
                ? Icon.chevronDown({size: 'sm'})
                : Icon.chevronRight({size: 'sm'});
            return div(icon);
        };

        // We will only have an xhColumnGroup if this was a configured column group. ag-Grid will
        // auto-create column groups to ensure the headers are balanced for columns which are not
        // in a group being rendered next to columns which are in groups.
        let headerName: ReactNode = displayName;
        if (xhColumnGroup && isFunction(xhColumnGroup.headerName)) {
            headerName = xhColumnGroup.headerName({
                columnGroup: xhColumnGroup,
                gridModel,
                agParams: null
            });
        }

        // If no app tooltip dynamically toggle a tooltip to display elided header
        let onMouseEnter = null;
        if (XH.isDesktop && isUndefined(xhColumnGroup?.headerTooltip)) {
            onMouseEnter = ({target: el}) => {
                if (el.offsetWidth < el.scrollWidth) {
                    const title = isString(headerName) ? headerName : displayName;
                    el.setAttribute('title', title);
                } else {
                    el.removeAttribute('title');
                }
            };
        }

        return div({
            className: classNames(
                className,
                isExpandable ? 'xh-grid-group-header--expandable' : null
            ),
            items: [span({onMouseEnter, item: headerName}), expandIcon()],
            onClick: e => {
                if (!isExpandable) return;

                e.stopPropagation();
                setExpanded(!isExpanded);
            }
        });
    }
});

class ColumnGroupHeaderModel extends HoistModel {
    override xhImpl = true;

    @bindable accessor isExpanded = true;

    get isExpandable() {
        return this.agColumnGroup.isExpandable();
    }

    get agColumnGroup(): AgProvidedColumnGroup {
        return this.componentProps.columnGroup.providedColumnGroup;
    }

    override onLinked() {
        this.syncIsExpanded();
        this.agColumnGroup.addEventListener('expandedChanged', this.syncIsExpanded);
    }

    override destroy() {
        this.agColumnGroup.removeEventListener('expandedChanged', this.syncIsExpanded);
        super.destroy();
    }

    syncIsExpanded = () => {
        this.isExpanded = this.agColumnGroup.isExpanded();
    };
}
