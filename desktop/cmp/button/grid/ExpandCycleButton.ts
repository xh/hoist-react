/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridLikeModel, GridModel} from '@xh/hoist/cmp/grid';
import {isGridLikeModel} from '@xh/hoist/cmp/grid/impl/GridLikeModel';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {logError, withDefault} from '@xh/hoist/utils/js';
import type {ButtonProps} from '../Button';
import {button} from '../Button';

export interface ExpandCycleButtonProps extends ButtonProps {
    /**
     * GridModel, or a model wrapping one, to which this button should bind. Will find the
     * nearest in context if not provided.
     */
    gridModel?: GridLikeModel;
}

/**
 * A button to expand a grouped or tree grid one level per click. Once the grid is fully expanded,
 * the next click collapses it and the cycle starts again. The default tooltip names the next
 * step. See {@link GridModel.cycleExpandLevel}.
 *
 * The recommended toolbar control for expanding grouped and tree grids. See
 * {@link ExpandToLevelButton} for a menu that jumps straight to a labelled level.
 */
export const [ExpandCycleButton, expandCycleButton] = hoistCmp.withFactory<ExpandCycleButtonProps>({
    displayName: 'ExpandCycleButton',
    className: 'xh-expand-cycle-button',
    model: false,

    render(
        {className, icon, title, tooltip, onClick, gridModel: boundModel, disabled, ...rest},
        ref
    ) {
        const gridModel = withDefault(
            boundModel,
            useContextModel<GridLikeModel>(isGridLikeModel)
        )?.innerGridModel;
        icon = withDefault(icon, Icon.angleDoubleDown());

        // Validate bound model available and suitable for use.
        if (!gridModel) {
            logError(
                'No GridModel available - provide via a `gridModel` prop or context - button will be disabled.',
                ExpandCycleButton
            );
            return button({ref, icon, title, tooltip, className, ...rest, disabled: true});
        }

        return button({
            ref,
            icon,
            title: title ?? tooltip ?? nextStepTitle(gridModel),
            disabled: withDefault(disabled, !gridModel.maxDepth || gridModel.empty),
            className,
            onClick: onClick ?? (() => gridModel.cycleExpandLevel()),
            ...rest
        });
    }
});

function nextStepTitle(gridModel: GridModel): string {
    const {nextExpandLevel: level, maxDepth, resolvedLevelLabels} = gridModel;
    if (level === 0) return 'Collapse all';
    if (level >= maxDepth) return 'Expand all';

    const label = resolvedLevelLabels?.[level];
    return label ? `Expand to ${label}` : 'Expand one level';
}
