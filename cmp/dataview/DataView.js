/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import {grid} from '@xh/hoist/cmp/grid';
import {hoistCmp, HoistModel, useLocalModel, uses} from '@xh/hoist/core';
import {apiRemoved} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import PT from 'prop-types';
import './DataView.scss';
import {DataViewModel} from './DataViewModel';

/**
 * A DataView is a specialized version of the Grid component. It displays its data within a
 * single column, using a configured component for rendering each item.
 */
export const [DataView, dataView] = hoistCmp.withFactory({
    displayName: 'DataView',
    model: uses(DataViewModel),
    className: 'xh-data-view',

    render({model, className, ...props}) {
        apiRemoved(props.itemHeight, 'itemHeight', 'Specify itemHeight on the DataViewModel instead.');
        apiRemoved(props.rowCls, 'rowCls', 'Specify rowClassFn on the DataViewModel instead.');

        const [layoutProps, {onRowDoubleClicked}] = splitLayoutProps(props);
        const localModel = useLocalModel(() => new LocalModel(model));

        return grid({
            ...layoutProps,
            className,
            model: model.gridModel,
            agOptions: localModel.agOptions,
            onRowDoubleClicked
        });
    }
});

DataView.propTypes = {
    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(DataViewModel), PT.object]),

    /**
     * Callback to call when a row is double clicked. Function will receive an event
     * with a data node containing the row's data.
     */
    onRowDoubleClicked: PT.func
};

@HoistModel
class LocalModel {
    model;
    agOptions;

    constructor(model) {
        this.model = model;

        this.addReaction({
            track: () => [model.itemHeight, model.groupRowHeight],
            run: () => model.gridModel.agApi?.resetRowHeights()
        });

        this.agOptions = {
            headerHeight: 0,
            suppressMakeColumnVisibleAfterUnGroup: true,
            getRowHeight: (params) => {
                // Return (required) itemHeight for data rows.
                if (!params.node?.group) return model.itemHeight;

                // For group rows, return groupRowHeight if specified, or use standard height
                // (DataView does not participate in grid sizing modes.)
                return model.groupRowHeight ?? AgGrid.getRowHeightForSizingMode('standard');
            }
        };
    }
}