/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {HoistComponent, elemFactory, LayoutSupport} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {DataViewModel} from './DataViewModel';

/**
 * A DataView is a specialized version of the Grid component. It displays its data within a
 * single column, using a configured component for rendering each item.
 */
@HoistComponent
@LayoutSupport
export class DataView extends Component {

    static modelClass = DataViewModel;

    static propTypes = {
        /** Primary component model instance. */
        model: PT.oneOfType([PT.instanceOf(DataViewModel), PT.object]).isRequired
    };

    baseClassName = 'xh-data-view';

    render() {
        const {rowCls, itemHeight, onRowDoubleClicked} = this.props;
        return grid({
            ...this.getLayoutProps(),
            className: this.getClassName(),
            model: this.model.gridModel,
            agOptions: {
                headerHeight: 0,
                rowClass: rowCls,
                getRowHeight: () => itemHeight
            },
            onRowDoubleClicked
        });
    }
}

export const dataView = elemFactory(DataView);