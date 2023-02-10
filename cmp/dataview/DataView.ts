/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import {grid} from '@xh/hoist/cmp/grid';
import {hoistCmp, HoistModel, useLocalModel, uses, lookup, PlainObject, HoistProps, BoxProps} from '@xh/hoist/core';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {isFunction} from 'lodash';

import './DataView.scss';
import {DataViewModel} from './DataViewModel';

export interface DataViewProps extends HoistProps<DataViewModel>, BoxProps {}

/**
 * A DataView is a specialized version of the Grid component. It displays its data within a
 * single column, using a configured component for rendering each item.
 */
export const [DataView, dataView] = hoistCmp.withFactory<DataViewProps>({
    displayName: 'DataView',
    model: uses(DataViewModel),
    className: 'xh-data-view',

    render({model, className, ...props}, ref) {
        const [layoutProps] = splitLayoutProps(props),
            impl = useLocalModel(DataViewLocalModel);

        return grid({
            ...layoutProps,
            className,
            ref,
            model: model.gridModel,
            agOptions: impl.agOptions
        });
    }
});

class DataViewLocalModel extends HoistModel {
    override xhImpl = true;

    @lookup(DataViewModel) model: DataViewModel;
    agOptions: PlainObject;

    override onLinked() {
        const {model} = this;

        this.addReaction({
            track: () => [model.itemHeight, model.groupRowHeight],
            run: () => model.gridModel.agApi?.resetRowHeights()
        });

        this.agOptions = {
            suppressMakeColumnVisibleAfterUnGroup: true,
            getRowHeight: (agParams) => {
                const {groupRowHeight, itemHeight} = model;

                // For group rows, return groupRowHeight if specified, or use standard height
                // (DataView does not participate in grid sizing modes.)
                if (agParams.node?.group) {
                    return groupRowHeight ?? (AgGrid as any).getRowHeightForSizingMode('standard');
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
