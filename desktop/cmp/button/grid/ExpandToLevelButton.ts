/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridLikeModel} from '@xh/hoist/cmp/grid';
import {isGridLikeModel} from '@xh/hoist/cmp/grid/impl/GridLikeModel';
import {div, vbox} from '@xh/hoist/cmp/layout';
import type {MenuItemLike} from '@xh/hoist/core';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import type {Position} from '@xh/hoist/kit/blueprint';
import {menu, popover} from '@xh/hoist/kit/blueprint';
import {parseMenuItems} from '@xh/hoist/desktop/cmp/menu/impl/MenuItems';
import {logError, withDefault} from '@xh/hoist/utils/js';
import type {ReactNode} from 'react';
import type {ButtonProps} from '../Button';
import {button} from '../Button';

export interface ExpandToLevelButtonProps extends Omit<ButtonProps, 'title'> {
    /**
     * GridModel, or a model wrapping one, to which this button should bind. Will find the
     * nearest in context if not provided.
     */
    gridModel?: GridLikeModel;

    /** Position for menu, as per Blueprint docs. */
    popoverPosition?: Position;

    /** Title for the menu popover - defaults to "Expand To Level". */
    title?: ReactNode;
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

        render({
            gridModel: boundModel,
            className,
            icon,
            title,
            popoverPosition,
            disabled,
            ...rest
        }) {
            const gridModel = withDefault(
                boundModel,
                useContextModel<GridLikeModel>(isGridLikeModel)
            )?.innerGridModel;
            icon = withDefault(icon, Icon.treeList());
            title = withDefault(title, 'Expand To Level');

            const disabledButton = () => button({icon, className, ...rest, disabled: true});

            // Validate bound model available and suitable for use.
            if (!gridModel) {
                logError(
                    'No GridModel available - provide via `gridModel` prop or context - button will be disabled.',
                    ExpandToLevelButton
                );
                return disabledButton();
            }

            // Render a disabled button if requested, if we have a flat grid, or no level labels
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

            return popover({
                popoverClassName: 'xh-expand-to-level-button__popover',
                position: withDefault(popoverPosition, 'auto'),
                item: button({
                    icon,
                    className,
                    ...rest
                }),
                content: vbox(
                    div({className: 'xh-popup__title', item: title, omit: !title}),
                    menu(parseMenuItems(menuItems))
                )
            });
        }
    });
