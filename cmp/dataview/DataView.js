/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import {computed} from '@xh/hoist/mobx';
import PT from 'prop-types';
import {uses, hoistCmp, useLocalModel} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {DataViewModel} from './DataViewModel';
import {apiRemoved} from '@xh/hoist/utils/js';
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

class LocalModel {
    model;

    constructor(model) {
        this.model = model;
    }

    @computed
    get agOptions() {
        const {itemHeight, groupRowHeight, groupElementRenderer} = this.model;
        return {
            headerHeight: 0,
            getRowHeight: (params) => {
                // Return (required) itemHeight for data rows.
                if (!params.node?.group) return itemHeight;

                // For group rows, return groupRowHeight if specified, or use standard height
                // (DataView does not participate in grid sizing modes.)
                return groupRowHeight ?? AgGrid.getRowHeightForSizingMode('standard');
            },
            ...(groupElementRenderer ? {groupRowRendererFramework: groupElementRenderer} : {})
        };
    }
}