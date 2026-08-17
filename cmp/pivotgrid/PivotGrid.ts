/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {hoistCmp, HoistProps, LayoutProps, TestSupportProps, uses} from '@xh/hoist/core';
import {GridOptions} from '@xh/hoist/kit/ag-grid';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {PivotGridModel} from './PivotGridModel';

export interface PivotGridProps<M extends PivotGridModel = PivotGridModel>
    extends HoistProps<M>, LayoutProps, TestSupportProps {
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
}

/**
 * A PivotGrid is a specialized version of the Grid component.
 *
 * It displays group rows down a tree column and pivot paths across nested column groups, with
 * optional docked summaries. See {@link PivotGridModel} for its configuration, and
 * {@link PivotView} for the query that supplies its data.
 */
export const [PivotGrid, pivotGrid] = hoistCmp.withFactory<PivotGridProps>({
    displayName: 'PivotGrid',
    model: uses(PivotGridModel),
    className: 'xh-pivot-grid',

    render({model, className, testId, ...props}, ref) {
        const [layoutProps] = splitLayoutProps(props);

        return grid({
            ...layoutProps,
            className,
            testId,
            ref,
            model: model.gridModel,
            agOptions: props.agOptions
        });
    }
});
