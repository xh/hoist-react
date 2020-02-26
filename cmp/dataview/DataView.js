/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import PT from 'prop-types';
import {uses, hoistCmp, useLocalModel, HoistModel} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {DataViewModel} from './DataViewModel';
import {apiRemoved} from '@xh/hoist/utils/js';
import {merge} from 'lodash';
import './DataView.scss';

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
        const localModel = useLocalModel(() => new LocalModel(model, props));

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
     * Options for ag-Grid's API.
     *
     * This constitutes an 'escape hatch' for applications that need to get to the underlying
     * ag-Grid API.  It should be used with care. Settings made here might be overwritten and/or
     * interfere with the implementation of this component and its use of the ag-Grid API.
     *
     * Note that changes to these options after the component's initial render will be ignored.
     */
    agOptions: PT.object,
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

    constructor(model, props) {
        this.model = model;

        this.addReaction({
            track: () => [model.itemHeight, model.groupRowHeight],
            run: () => model.gridModel.agApi?.resetRowHeights()
        });
        this.agOptions = merge(this.createDefaultAgOptions(), props.agOptions || {});
    }

    createDefaultAgOptions() {
        const {model} = this;
        return {
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