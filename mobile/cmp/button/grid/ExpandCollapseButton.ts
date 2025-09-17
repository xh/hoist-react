/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {logError} from '@xh/hoist/utils/log';
import {withDefault} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';

export interface ExpandCollapseButtonProps extends ButtonProps {
    /**
     * `GridModel` to which this button should bind.
     * Optional, will find nearest GridModel in context if not provided.
     */
    gridModel?: GridModel;
}

/**
 * A convenience button to expand / collapse all rows in a grouped or tree Grid.
 */
export const [ExpandCollapseButton, expandCollapseButton] =
    hoistCmp.withFactory<ExpandCollapseButtonProps>({
        displayName: 'ExpandCollapseButton',
        className: 'xh-expand-collapse-button',
        model: false,

        render({className, gridModel, onClick, ...props}) {
            gridModel = withDefault(gridModel, useContextModel(GridModel));

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
