/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridLikeModel} from '@xh/hoist/cmp/grid';
import {isGridLikeModel} from '@xh/hoist/cmp/grid/impl/GridLikeModel';
import type {MenuItemLike} from '@xh/hoist/core';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import '@xh/hoist/mobile/register';
import {logError, withDefault} from '@xh/hoist/utils/js';
import type {MenuButtonProps} from '../../menu';
import {menuButton} from '../../menu';

export interface ExpandToLevelButtonProps extends MenuButtonProps {
    /**
     * GridModel, or a model wrapping one, to which this button should bind. Will find the
     * nearest in context if not provided.
     */
    gridModel?: GridLikeModel;
}

/**
 * A menu button to expand a multi-level grouped or tree grid out to a desired level.
 * Requires {@link GridConfig.levelLabels} to be configured on the bound GridModel - the menu offers
 * one entry per labelled level, so a partial array will limit the available expand-to targets.
 */
export const [ExpandToLevelButton, expandToLevelButton] =
    hoistCmp.withFactory<ExpandToLevelButtonProps>({
        displayName: 'ExpandToLevelButton',
        className: 'xh-expand-to-level-button',
        model: false,

        render({gridModel: boundModel, className, icon, disabled, ...rest}) {
            const gridModel = withDefault(
                boundModel,
                useContextModel<GridLikeModel>(isGridLikeModel)
            )?.innerGridModel;
            icon = withDefault(icon, Icon.treeList());

            const disabledButton = () =>
                menuButton({
                    icon,
                    className,
                    ...rest,
                    disabled: true,
                    menuItems: []
                });

            if (!gridModel) {
                logError(
                    "No GridModel available. Provide via a 'gridModel' prop, or context.",
                    ExpandToLevelButton
                );
                return disabledButton();
            }

            // Render a disabled button if requested or if we have a flat grid, or no level labels
            const {maxDepth, resolvedLevelLabels} = gridModel;
            if (disabled || !maxDepth || !resolvedLevelLabels) return disabledButton();

            const menuItems: MenuItemLike[] = resolvedLevelLabels.map((label, idx) => {
                const isCurrLevel = gridModel.isCurrentExpandLevel(idx);

                return {
                    icon: isCurrLevel ? Icon.check() : Icon.placeholder(),
                    text: label,
                    actionFn: () => gridModel.expandToLevel(idx)
                };
            });

            return menuButton({
                title: 'Expand To',
                icon,
                className,
                menuItems,
                ...rest
            });
        }
    });
