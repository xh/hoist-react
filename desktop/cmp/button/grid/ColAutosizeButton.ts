/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridAutosizeOptions, GridModel} from '@xh/hoist/cmp/grid';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {logError, withDefault} from '@xh/hoist/utils/js';
import {button, ButtonProps} from '../Button';

export interface ColAutosizeButtonProps extends ButtonProps {
    /** GridModel to which this button should bind. Will find nearest in context if not provided. */
    gridModel?: GridModel;

    /** Options for the grid autosize. */
    autosizeOptions?: Omit<GridAutosizeOptions, 'mode'>;
}

/**
 * A convenience button to autosize visible Grid columns.
 */
export const [ColAutosizeButton, colAutosizeButton] = hoistCmp.withFactory<ColAutosizeButtonProps>({
    displayName: 'ColAutosizeButton',
    className: 'xh-col-autosize-button',
    model: false,

    render(
        {className, icon, title, onClick, gridModel, disabled, autosizeOptions = {}, ...rest},
        ref
    ) {
        gridModel = withDefault(gridModel, useContextModel(GridModel));

        // Validate bound model available and suitable for use.
        if (!gridModel) {
            logError(
                'No GridModel available - provide via a `gridModel` prop or context - button will be disabled.',
                ColAutosizeButton
            );
            disabled = true;
        } else if (!gridModel.autosizeEnabled) {
            logError(
                'Autosize not enabled on bound GridModel - button will be disabled.',
                ColAutosizeButton
            );
            disabled = true;
        }

        onClick =
            onClick ??
            (() =>
                gridModel.autosizeAsync({
                    showMask: true,
                    ...autosizeOptions
                }));

        return button({
            ref,
            icon: withDefault(icon, Icon.arrowsLeftRight()),
            title: withDefault(title, 'Autosize Columns'),
            disabled: withDefault(disabled, gridModel?.empty),
            className,
            onClick,
            ...rest
        });
    }
});
