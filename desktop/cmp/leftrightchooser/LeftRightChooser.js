/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {cloneDeep} from 'lodash';
import {hoistCmp, uses} from '@xh/hoist/core';
import {vbox, hframe} from '@xh/hoist/cmp/layout';
import {grid} from '@xh/hoist/cmp/grid';
import {getLayoutProps} from '@xh/hoist/utils/react';

import {LeftRightChooserModel} from './LeftRightChooserModel';

import {description} from './impl/Description';
import {chooserToolbar} from './impl/ChooserToolbar';
import './LeftRightChooser.scss';

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

    render({model, className, ...props}) {
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
            className,
            ...getLayoutProps(props)
        });
    }
});
LeftRightChooser.propTypes = {
    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(LeftRightChooserModel), PT.object]).isRequired
};