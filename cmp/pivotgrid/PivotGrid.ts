/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {GridOptions} from '@xh/hoist/kit/ag-grid';
import {PivotGridModel} from './PivotGridModel';

export interface PivotGridProps extends HoistProps<PivotGridModel> {
    /** "Escape hatch" options passed directly to the underlying ag-Grid. */
    agOptions?: GridOptions;
}

/**
 * Grid displaying a {@link PivotGridModel} - group rows down, pivot paths across.
 *
 * @see PivotGridModel
 */
export const [PivotGrid, pivotGrid] = hoistCmp.withFactory<PivotGridProps>({
    displayName: 'PivotGrid',
    className: 'xh-pivot-grid',
    model: uses(PivotGridModel),
    render({model, className, agOptions}) {
        return grid({model: model.gridModel, className, agOptions});
    }
});
