/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {GridOptions} from '@ag-grid-community/core';
import {grid} from '@xh/hoist/cmp/grid';
import {hframe, vbox} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {cloneDeep} from 'lodash';
import {chooserToolbar} from '../../../../leftrightchooser/impl/ChooserToolbar';
import {description} from '../../../../leftrightchooser/impl/Description';
import {LRChooserModel} from './LRChooserModel';
import './LRChooser.scss';

export interface LRChooserProps extends HoistProps, BoxProps {
    model?: LRChooserModel;
}

type LeftGridOptions = {
    agOptions: GridOptions;
};

type RightGridOptions = {
    agOptions: GridOptions;
};

/**
 * A component for moving a list of items between two arbitrary groups. By convention, the left
 * group represents 'available' items and the right group represents 'selected' items.
 * A next panel is also available to display a more in-depth description for any selected item.
 * @see LrChooserModel
 */
export const [LRChooser, lrChooser] = hoistCmp.withFactory<LRChooserProps>({
    displayName: 'LeftRightChooser',
    model: uses(LRChooserModel),
    className: 'xh-lr-chooser',

    render({model, ...props}, ref) {
        const {leftModel, rightModel} = model,
            gridOptions = {
                agOptions: {
                    defaultColDef: {
                        resizable: false
                    },
                    rowDragEntireRow: true,
                    rowDragMultiRow: true,
                    animateRows: true,
                    onRowDragMove: e => model.onRowDragMove(e)
                }
            },
            leftGridOptions: LeftGridOptions = cloneDeep(gridOptions),
            rightGridOptions: RightGridOptions = cloneDeep(gridOptions);

        leftGridOptions.agOptions.onRowDragEnd = e => model.onLeftDragEnd(e);
        rightGridOptions.agOptions.onRowDragEnd = e => model.onRightDragEnd(e);
        rightGridOptions.agOptions.onRowDragLeave = () => model.onRightDragLeave();
        rightGridOptions.agOptions.onRowDragEnter = () => model.onRightDragEnter();

        return vbox({
            ref,
            items: [
                hframe({
                    className: 'xh-lr-chooser__grid-frame',
                    items: [
                        grid({model: leftModel, ...leftGridOptions}),
                        chooserToolbar(),
                        grid({model: rightModel, ...rightGridOptions})
                    ]
                }),
                description()
            ],
            ...props
        });
    }
});
