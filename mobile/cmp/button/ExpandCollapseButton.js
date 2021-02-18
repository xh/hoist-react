/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/mobile/cmp/button';
import {withDefault} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import PT from 'prop-types';

/**
 * A convenience button to expand / collapse all rows in a tree grid
 */
export const [ExpandCollapseButton, expandCollapseButton] = hoistCmp.withFactory({
    displayName: 'ExpandCollapseButton',
    model: false,
    render({
        gridModel,
        onClick,
        autosizeOptions = {},
        ...props
    }) {
        gridModel = withDefault(gridModel, useContextModel(GridModel));

        if (!gridModel?.treeMode) {
            console.error("No GridModel available with treeMode enabled. Provide via a 'gridModel' prop, or context.");
            return button({icon: Icon.expand(), disabled: true, ...props});
        }

        const shouldCollapse = !isEmpty(gridModel.expandState),
            disabled = gridModel.store.allRootCount === gridModel.store.allCount,
            icon = shouldCollapse ? Icon.collapse() : Icon.expand();

        onClick = onClick ?? (() => shouldCollapse ? gridModel.collapseAll() : gridModel.expandAll());

        return button({disabled, icon, onClick, ...props});
    }
});
ExpandCollapseButton.propTypes = {
    ...Button.propTypes,

    /** GridModel of the grid for which this button should autosize columns. */
    gridModel: PT.instanceOf(GridModel)
};
