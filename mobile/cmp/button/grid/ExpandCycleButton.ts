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

export interface ExpandCycleButtonProps extends ButtonProps {
    /**
     * GridModel, or a model wrapping one, to which this button should bind. Will find the
     * nearest in context if not provided.
     */
    gridModel?: GridLikeModel;
}

/**
 * A button to expand a grouped or tree grid one level per tap. Once the grid is fully expanded,
 * the next tap collapses it and the cycle starts again. See {@link GridModel.cycleExpandLevel}.
 *
 * The recommended toolbar control for expanding grouped and tree grids. See
 * {@link ExpandToLevelButton} for a menu that jumps straight to a labelled level.
 */
export const [ExpandCycleButton, expandCycleButton] = hoistCmp.withFactory<ExpandCycleButtonProps>({
    displayName: 'ExpandCycleButton',
    className: 'xh-expand-cycle-button',
    model: false,

    render({className, icon, onClick, gridModel: boundModel, disabled, ...rest}) {
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
            return button({icon, className, ...rest, disabled: true});
        }

        return button({
            icon,
            disabled: withDefault(disabled, !gridModel.maxDepth || gridModel.empty),
            className,
            onClick: onClick ?? (() => gridModel.cycleExpandLevel()),
            ...rest
        });
    }
});
