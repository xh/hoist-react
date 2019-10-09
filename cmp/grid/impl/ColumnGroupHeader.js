import {div, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {Icon} from '@xh/hoist/icon';
import {isFunction} from 'lodash';
import classNames from 'classnames';

/**
 * A custom ag-Grid group header component.
 *
 * @private
 */
export const ColumnGroupHeader = hoistCmp({
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

@HoistModel
class LocalModel {
    /** @member {ColumnGroup} */
    agColumnGroup;

    @bindable isExpanded = true;

    get isExpandable() {return this.agColumnGroup.isExpandable()}

    constructor({columnGroup: agColumnGroup}) {
        this.agColumnGroup = agColumnGroup.originalColumnGroup;
        this.syncIsExpanded();
        this.agColumnGroup.addEventListener('expandedChanged', this.syncIsExpanded);
    }

    destroy() {
        this.agColumnGroup.removeEventListener('expandedChanged', this.syncIsExpanded);
    }

    syncIsExpanded = () => this.setIsExpanded(this.agColumnGroup.isExpanded());
}