/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {hframe, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {cloneDeep} from 'lodash';
import PT from 'prop-types';
import {chooserToolbar} from '../../../../leftrightchooser/impl/ChooserToolbar';
import {description} from '../../../../leftrightchooser/impl/Description';
import {LRChooserModel} from './LRChooserModel';
import './LRChooser.scss';


/**
 * A component for moving a list of items between two arbitrary groups. By convention, the left
 * group represents 'available' items and the right group represents 'selected' items.
 * A next panel is also available to display a more in-depth description for any selected item.
 * @see LrChooserModel
 */
export const [LRChooser, lrChooser] = hoistCmp.withFactory({
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
                    onRowDragMove: (e) => model.onRowDragMove(e)
                }
            },
            leftGridOptions = cloneDeep(gridOptions),
            rightGridOptions = cloneDeep(gridOptions);

        leftGridOptions.agOptions.onRowDragEnd = (e) => model.onLeftDragEnd(e);
        rightGridOptions.agOptions.onRowDragEnd = (e) => model.onRightDragEnd(e);
        rightGridOptions.agOptions.onRowDragLeave = (e) => model.onRightDragLeave(e);
        rightGridOptions.agOptions.onRowDragEnter = (e) => model.onRightDragEnter(e);

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
lrChooser.propTypes = {
    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(LRChooserModel), PT.object])
};


