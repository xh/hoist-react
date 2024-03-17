/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {logError, withDefault} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';

export interface ExpandCollapseButtonProps extends ButtonProps {
    /** GridModel of the grid for which this button should show a chooser. */
    gridModel?: GridModel;
}

/**
 * A convenience button to expand / collapse all rows in grouped or tree grid.
 */
export const [ExpandCollapseButton, expandCollapseButton] =
    hoistCmp.withFactory<ExpandCollapseButtonProps>({
        displayName: 'ExpandCollapseButton',
        model: false,
        render({gridModel, onClick, ...props}) {
            gridModel = withDefault(gridModel, useContextModel(GridModel));

            if (!gridModel) {
                logError(
                    "No GridModel available. Provide via a 'gridModel' prop, or context.",
                    ExpandCollapseButton
                );
                return button({icon: Icon.expand(), disabled: true, ...props});
            }

            const shouldCollapse = !isEmpty(gridModel.expandState),
                disabled = gridModel.treeMode
                    ? gridModel.store.allRootCount === gridModel.store.allCount
                    : isEmpty(gridModel.groupBy),
                icon = shouldCollapse ? Icon.collapse() : Icon.expand();

            onClick =
                onClick ??
                (() => (shouldCollapse ? gridModel.collapseAll() : gridModel.expandAll()));

            return button({disabled, icon, onClick, ...props});
        }
    });
