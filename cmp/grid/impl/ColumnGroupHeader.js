/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {div, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import classNames from 'classnames';
import {isFunction} from 'lodash';

/**
 * A custom ag-Grid group header component.
 *
 * @private
 */
export const columnGroupHeader = hoistCmp.factory({
    displayName: 'ColumnGroupHeader',
    className: 'xh-grid-group-header',
    model: false,

    render(props) {
        const impl = useLocalModel(() => new LocalModel(props)),
            expandIcon = () => {
                if (!impl.isExpandable) return null;

                const icon = impl.isExpanded ? Icon.chevronLeft({size: 'sm'}) : Icon.chevronRight({size: 'sm'});
                return div(icon);
            };

        // We will only have an xhColumnGroup if this was a configured column group. ag-Grid will
        // auto-create column groups to ensure the headers are balanced for columns which are not
        // in a group being rendered next to columns which are in groups.
        let headerName = props.displayName;
        const {xhColumnGroup, gridModel} = props;
        if (xhColumnGroup && isFunction(xhColumnGroup.headerName)) {
            headerName = xhColumnGroup.headerName({columnGroup: xhColumnGroup, gridModel});
        }

        return div({
            className: classNames(props.className, impl.isExpandable ? 'xh-grid-group-header--expandable' : null),
            items: [
                span(headerName),
                expandIcon()
            ],
            onClick: (e) => {
                if (!impl.isExpandable) return;

                e.stopPropagation();
                props.setExpanded(!impl.isExpanded);
            }
        });
    }
});

class LocalModel extends HoistModel {
    /** @member {ColumnGroup} */
    agColumnGroup;

    @bindable isExpanded = true;

    get isExpandable() {return this.agColumnGroup.isExpandable()}

    constructor({columnGroup: agColumnGroup}) {
        super();
        makeObservable(this);
        this.agColumnGroup = agColumnGroup.originalColumnGroup;
        this.syncIsExpanded();
        this.agColumnGroup.addEventListener('expandedChanged', this.syncIsExpanded);
    }

    destroy() {
        this.agColumnGroup.removeEventListener('expandedChanged', this.syncIsExpanded);
        super.destroy();
    }

    syncIsExpanded = () => this.setIsExpanded(this.agColumnGroup.isExpanded());
}