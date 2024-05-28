/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ForwardedRef} from 'react';
import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import {grid} from '@xh/hoist/cmp/grid';
import {
    hoistCmp,
    HoistModel,
    HoistProps,
    LayoutProps,
    lookup,
    PlainObject,
    TestSupportProps,
    useLocalModel,
    uses
} from '@xh/hoist/core';
import type {GridOptions} from '@xh/hoist/kit/ag-grid';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {isFunction, merge} from 'lodash';
import './DataView.scss';
import {DataViewModel} from './DataViewModel';

export interface DataViewProps extends HoistProps<DataViewModel>, LayoutProps, TestSupportProps {
    /**
     * Options for ag-Grid's API.
     *
     * This constitutes an 'escape hatch' for applications that need to get to the underlying
     * ag-Grid API. It should be used with care. Settings made here might be overwritten and/or
     * interfere with the implementation of this component and its use of the ag-Grid API.
     *
     * Note that changes to these options after the component's initial render will be ignored.
     */
    agOptions?: GridOptions;

    ref?: ForwardedRef<HTMLDivElement>;
}

/**
 * A DataView is a specialized version of the Grid component. It displays its data within a
 * single column, using a configured component for rendering each item.
 */
export const [DataView, dataView] = hoistCmp.withFactory<DataViewProps>({
    displayName: 'DataView',
    model: uses(DataViewModel),
    className: 'xh-data-view',

    render({model, className, testId, ...props}, ref) {
        const [layoutProps] = splitLayoutProps(props),
            impl = useLocalModel(DataViewLocalModel);

        return grid({
            ...layoutProps,
            className,
            testId,
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

        this.agOptions = merge(this.createDefaultAgOptions(), this.componentProps.agOptions || {});
    }

    private createDefaultAgOptions(): GridOptions {
        const {model} = this;
        return {
            headerHeight: 0,
            suppressMakeColumnVisibleAfterUnGroup: true,
            getRowHeight: agParams => {
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
