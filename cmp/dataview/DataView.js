/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {bindable} from '@xh/hoist/mobx';
import PT from 'prop-types';
import {uses, hoistCmp, useLocalModel, HoistModel} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {DataViewModel} from './DataViewModel';
import {throwIf} from '@xh/hoist/utils/js';
import {isNumber} from 'lodash';

/**
 * A DataView is a specialized version of the Grid component. It displays its data within a
 * single column, using a configured component for rendering each item.
 */
export const [DataView, dataView] = hoistCmp.withFactory({
    displayName: 'DataView',
    model: uses(DataViewModel),
    className: 'xh-data-view',

    render({model, className, ...props}) {
        const [layoutProps, {rowCls, itemHeight, onRowDoubleClicked}] = splitLayoutProps(props);

        throwIf(!isNumber(itemHeight), 'Must specify a number for itemHeight in DataView.');
        const itemHeightModel = useLocalModel(() => new ItemHeightModel(model, itemHeight));
        itemHeightModel.setItemHeight(itemHeight);

        return grid({
            ...layoutProps,
            className,
            model: model.gridModel,
            agOptions: {
                headerHeight: 0,
                rowClass: rowCls,
                getRowHeight: () => itemHeightModel.itemHeight
            },
            onRowDoubleClicked
        });
    }
});
DataView.propTypes = {
    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(DataViewModel), PT.object]),

    /** Row height for each item displayed in the view */
    itemHeight: PT.number.isRequired,

    /** CSS class used for each row */
    rowCls: PT.string,

    /**
     * Callback to call when a row is double clicked. Function will receive an event
     * with a data node containing the row's data.
     */
    onRowDoubleClicked: PT.func

};

@HoistModel
class ItemHeightModel {
    @bindable
    itemHeight;

    constructor(model, initial) {
        this.addReaction({
            track: () => this.itemHeight,
            run: () => model.gridModel.agApi?.resetRowHeights()
        });
    }
}