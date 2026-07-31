import {GridOptions} from 'ag-grid-community';
import {grid} from '@xh/hoist/cmp/grid';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {PivotGridModel} from './PivotGridModel';

export interface PivotGridProps extends HoistProps<PivotGridModel> {
    agOptions?: GridOptions;
}

export const pivotGrid = hoistCmp.factory<PivotGridProps>({
    className: 'pivot-grid',
    model: uses(PivotGridModel),
    render({className, agOptions}) {
        return grid({
            className,
            agOptions
        });
    }
});
