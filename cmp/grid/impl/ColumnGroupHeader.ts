/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {div, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, creates} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {makeObservable, bindable} from '@xh/hoist/mobx';
import classNames from 'classnames';
import {isFunction} from 'lodash';

/**
 * A custom ag-Grid group header component.
 *
 * @internal
 */
export const columnGroupHeader = hoistCmp.factory({
    displayName: 'ColumnGroupHeader',
    className: 'xh-grid-group-header',
    model: creates(() => ColumnGroupHeaderModel),

    render({model, className, xhColumnGroup, gridModel, setExpanded, displayName}) {
        const {isExpandable, isExpanded} = model;
        const expandIcon = () => {
            if (!isExpandable) return null;

            const icon = isExpanded ? Icon.chevronLeft({size: 'sm'}) : Icon.chevronRight({size: 'sm'});
            return div(icon);
        };

        // We will only have an xhColumnGroup if this was a configured column group. ag-Grid will
        // auto-create column groups to ensure the headers are balanced for columns which are not
        // in a group being rendered next to columns which are in groups.
        let headerName = displayName;
        if (xhColumnGroup && isFunction(xhColumnGroup.headerName)) {
            headerName = xhColumnGroup.headerName({columnGroup: xhColumnGroup, gridModel});
        }

        return div({
            className: classNames(className, isExpandable ? 'xh-grid-group-header--expandable' : null),
            items: [
                span(headerName),
                expandIcon()
            ],
            onClick: (e) => {
                if (!isExpandable) return;

                e.stopPropagation();
                setExpanded(!isExpanded);
            }
        });
    }
});

class ColumnGroupHeaderModel extends HoistModel {
    override xhImpl = true;

    @bindable isExpanded = true;

    get isExpandable() {
        return this.agColumnGroup.isExpandable();
    }

    get agColumnGroup() {
        return this.componentProps.columnGroup.providedColumnGroup;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.syncIsExpanded();
        this.agColumnGroup.addEventListener('expandedChanged', this.syncIsExpanded);
    }

    override destroy() {
        this.agColumnGroup.removeEventListener('expandedChanged', this.syncIsExpanded);
        super.destroy();
    }

    syncIsExpanded = () => this.isExpanded = this.agColumnGroup.isExpanded();
}
