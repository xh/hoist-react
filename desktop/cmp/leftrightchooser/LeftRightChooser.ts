/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid, GridProps} from '@xh/hoist/cmp/grid';
import {hframe, vbox} from '@xh/hoist/cmp/layout';
import {BoxProps, hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {chooserToolbar} from './impl/ChooserToolbar';
import {description} from './impl/Description';
import './LeftRightChooser.scss';
import {LeftRightChooserModel} from './LeftRightChooserModel';
import {cloneDeep} from 'lodash';

export interface LeftRightChooserProps extends HoistProps<LeftRightChooserModel>, BoxProps {}

/**
 * A component for moving a list of items between two arbitrary groups. By convention, the left
 * group represents 'available' items and the right group represents 'selected' items.
 * A nested panel is also available to display a more in-depth description for any selected item.
 * @see LeftRightChooserModel
 */
export const [LeftRightChooser, leftRightChooser] = hoistCmp.withFactory<LeftRightChooserProps>({
    displayName: 'LeftRightChooser',
    model: uses(LeftRightChooserModel),
    className: 'xh-lr-chooser',

    render({model, ...props}, ref) {
        const {leftModel, rightModel, leftGroupingExpanded, rightGroupingExpanded} = model,
            gridOptions: GridProps = {
                agOptions: {
                    defaultColDef: {
                        resizable: false
                    }
                }
            },
            leftGridOptions = cloneDeep(gridOptions),
            rightGridOptions = cloneDeep(gridOptions);

        if (!leftGroupingExpanded) leftGridOptions.agOptions.groupDefaultExpanded = 0;
        if (!rightGroupingExpanded) rightGridOptions.agOptions.groupDefaultExpanded = 0;

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
