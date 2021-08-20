/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import {grid} from '@xh/hoist/cmp/grid';
import {hoistCmp, HoistModel, useLocalModel, uses} from '@xh/hoist/core';
import {apiRemoved} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {isFunction} from 'lodash';
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

    render({model, className, ...props}, ref) {
        apiRemoved('DataView.onRowClicked', {test: props.onRowClicked, msg: 'Specify onRowClicked on the DataViewModel instead', v: 'v43'});
        apiRemoved('DataView.onRowDoubleClicked', {test: props.onRowDoubleClicked, msg: 'Specify onRowDoubleClicked on the DataViewModel instead', v: 'v43'});

        const [layoutProps] = splitLayoutProps(props);
        const localModel = useLocalModel(() => new LocalModel(model));

        return grid({
            ...layoutProps,
            className,
            ref,
            model: model.gridModel,
            agOptions: localModel.agOptions
        });
    }
});

DataView.propTypes = {
    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(DataViewModel), PT.object])
};

class LocalModel extends HoistModel {
    model;
    agOptions;

    constructor(model) {
        super();
        this.model = model;

        this.addReaction({
            track: () => [model.itemHeight, model.groupRowHeight],
            run: () => model.gridModel.agApi?.resetRowHeights()
        });

        this.agOptions = {
            headerHeight: 0,
            suppressMakeColumnVisibleAfterUnGroup: true,
            getRowHeight: (agParams) => {
                const {groupRowHeight, itemHeight} = model;

                // For group rows, return groupRowHeight if specified, or use standard height
                // (DataView does not participate in grid sizing modes.)
                if (agParams.node?.group) {
                    return groupRowHeight ?? AgGrid.getRowHeightForSizingMode('standard');
                }

                // Return (required) itemHeight for data rows.
                if (isFunction(itemHeight)) {
                    return itemHeight({record: agParams.data, dataViewModel: model, agParams});
                }

                return itemHeight;
            }
        };
    }
}
