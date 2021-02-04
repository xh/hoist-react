/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {hframe, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {cloneDeep} from 'lodash';
import PT from 'prop-types';
import {chooserToolbar} from './impl/ChooserToolbar';
import {description} from './impl/Description';
import './LeftRightChooser.scss';
import {LeftRightChooserModel} from './LeftRightChooserModel';

/**
 * A component for moving a list of items between two arbitrary groups. By convention, the left
 * group represents 'available' items and the right group represents 'selected' items.
 * A nested panel is also available to display a more in-depth description for any selected item.
 * @see LeftRightChooserModel
 */
export const [LeftRightChooser, leftRightChooser] = hoistCmp.withFactory({
    displayName: 'LeftRightChooser',
    model: uses(LeftRightChooserModel),
    className: 'xh-lr-chooser',

    render({model, ...props}, ref) {
        const {leftModel, rightModel, leftGroupingExpanded, rightGroupingExpanded} = model,
            gridOptions = {
                onRowDoubleClicked: (e) => {
                    if (e.data) model.moveRows([e.data]);
                },
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
LeftRightChooser.propTypes = {
    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(LeftRightChooserModel), PT.object])
};
