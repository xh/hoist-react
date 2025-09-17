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

export interface ColChooserButtonProps extends ButtonProps {
    /** GridModel to which this button should bind. Will find nearest in context if not provided. */
    gridModel?: GridModel;
}

/**
 * A convenience button to trigger the display of a ColChooser for user selection, discovery and
 * reordering of available Grid columns.
 *
 * Requires {@link GridConfig.colChooserModel} to be configured on the bound GridModel.
 */
export const [ColChooserButton, colChooserButton] = hoistCmp.withFactory<ColChooserButtonProps>({
    displayName: 'ColChooserButton',
    className: 'xh-col-chooser-button',
    model: false,

    render({className, gridModel, icon, onClick, disabled, ...props}) {
        gridModel = withDefault(gridModel, useContextModel(GridModel));

        if (!onClick) {
            // Validate bound model available and suitable for use.
            if (!gridModel) {
                logError(
                    'No GridModel available - provide via a `gridModel` prop or context - button will be disabled.',
                    ColChooserButton
                );
                disabled = true;
            } else if (!gridModel.colChooserModel) {
                logError(
                    'ColChooser not enabled on bound GridModel - button will be disabled.',
                    ColChooserButton
                );
                disabled = true;
            }
        }

        onClick = onClick ?? (() => gridModel.showColChooser());
        return button({
            icon: withDefault(icon, Icon.gridPanel()),
            disabled,
            onClick,
            ...props
        });
    }
});
