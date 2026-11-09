/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridLikeModel} from '@xh/hoist/cmp/grid';
import {isGridLikeModel} from '@xh/hoist/cmp/grid/impl/GridLikeModel';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import type {ButtonProps} from '@xh/hoist/mobile/cmp/button';
import {button} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {logError, withDefault} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';

export interface ExpandCollapseButtonProps extends ButtonProps {
    /**
     * GridModel, or a model wrapping one, to which this button should bind. Will find the
     * nearest in context if not provided.
     */
    gridModel?: GridLikeModel;
}

/**
 * A convenience button to expand / collapse all rows in a grouped or tree Grid.
 */
export const [ExpandCollapseButton, expandCollapseButton] =
    hoistCmp.withFactory<ExpandCollapseButtonProps>({
        displayName: 'ExpandCollapseButton',
        className: 'xh-expand-collapse-button',
        model: false,

        render({className, gridModel: boundModel, onClick, ...props}) {
            const gridModel = withDefault(
                boundModel,
                useContextModel<GridLikeModel>(isGridLikeModel)
            )?.innerGridModel;

            // Validate bound model available and suitable for use.
            if (!onClick && !gridModel) {
                logError(
                    'No GridModel available - provide via `gridModel` prop or context - button will be disabled.',
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

            return button({className, disabled, icon, onClick, ...props});
        }
    });
