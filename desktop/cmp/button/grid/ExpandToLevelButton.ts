/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {div, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, MenuItemLike, useContextModel} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {menu, popover, Position} from '@xh/hoist/kit/blueprint';
import {parseMenuItems} from '@xh/hoist/utils/impl';
import {logError, withDefault} from '@xh/hoist/utils/js';
import {ReactNode} from 'react';
import {button, ButtonProps} from '../Button';

export interface ExpandToLevelButtonProps extends Omit<ButtonProps, 'title'> {
    /** GridModel to which this button should bind. Will find nearest in context if not provided. */
    gridModel?: GridModel;

    /** Position for menu, as per Blueprint docs. */
    popoverPosition?: Position;

    /** Title for the menu popover - defaults to "Expand To Level". */
    title?: ReactNode;
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

        render({gridModel, className, icon, title, popoverPosition, disabled, ...rest}) {
            gridModel = withDefault(gridModel, useContextModel(GridModel));
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
            const {maxDepth, expandLevel, resolvedLevelLabels} = gridModel;
            if (disabled || !maxDepth || !resolvedLevelLabels) return disabledButton();

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

            return popover({
                popoverClassName: 'xh-expand-to-level-button__popover xh-popup--framed',
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
