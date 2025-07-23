/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {hoistCmp, MenuItemLike, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import '@xh/hoist/mobile/register';
import {logError, withDefault} from '@xh/hoist/utils/js';
import {menuButton, MenuButtonProps} from '../../menu';

export interface ExpandToLevelButtonProps extends MenuButtonProps {
    /**
     * `GridModel` to which this button should bind.
     * Optional, will find nearest GridModel in context if not provided.
     */
    gridModel?: GridModel;
}

/**
 * A menu button to expand a multi-level grouped or tree grid out to a desired level.
 * Requires {@link GridConfig.levelLabels} to be configured on the bound GridModel.
 */
export const [ExpandToLevelButton, expandToLevelButton] =
    hoistCmp.withFactory<ExpandToLevelButtonProps>({
        displayName: 'ExpandToLevelButton',
        className: 'xh-expand-to-level-button',
        model: false,

        render({gridModel, className, icon, disabled, ...rest}) {
            gridModel = withDefault(gridModel, useContextModel(GridModel));
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
            const {maxDepth, expandLevel, resolvedLevelLabels} = gridModel;
            if (disabled || maxDepth <= 1 || resolvedLevelLabels) return disabledButton();

            const menuItems: MenuItemLike[] = resolvedLevelLabels.map((label, idx) => {
                const isCurrLevel =
                    expandLevel === idx ||
                    (expandLevel > maxDepth && idx === resolvedLevelLabels.length - 1);

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
