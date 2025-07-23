/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {ExportOptions} from '@xh/hoist/svc';
import {logError, withDefault} from '@xh/hoist/utils/js';
import {button, ButtonProps} from '../Button';

export interface ExportButtonProps extends ButtonProps {
    /** GridModel to which this button should bind. Will find nearest in context if not provided. */
    gridModel?: GridModel;

    exportOptions?: ExportOptions;
}

/**
 * Convenience Button preconfigured for use as a trigger for an export/download of data.
 *
 * Must be provided either an onClick handler *or* a gridModel. GridModel may be provided via props,
 * otherwise will be looked up by this model from context.
 *
 * If a GridModel is provided, this button will call {@link GridModel.exportAsync}. The grid's
 * {@link ExportOptions} will be used unless overridden via this component's `exportOptions` prop.
 *
 * Requires {@link GridConfig.enableExport} option to be true on the bound GridModel.
 */
export const [ExportButton, exportButton] = hoistCmp.withFactory<ExportButtonProps>({
    displayName: 'ExportButton',
    className: 'xh-export-button',
    model: false,

    render(
        {className, icon, title, onClick, gridModel, exportOptions = {}, disabled, ...rest},
        ref
    ) {
        const contextGridModel = useContextModel(GridModel);

        if (!onClick) {
            gridModel = withDefault(gridModel, contextGridModel);

            // Validate bound model available and suitable for use.
            if (!gridModel) {
                logError(
                    'No GridModel available - provide via a `gridModel` prop or context - button will be disabled.',
                    ExportButton
                );
                disabled = true;
            } else if (!gridModel.enableExport) {
                logError(
                    'Export not enabled on bound GridModel - button will be disabled',
                    ExportButton
                );
                disabled = true;
            } else {
                onClick = () => gridModel.exportAsync(exportOptions).catchDefault();
            }
        }

        return button({
            ref,
            icon: withDefault(icon, Icon.download()),
            title: withDefault(title, 'Export'),
            disabled: withDefault(disabled, gridModel && gridModel.empty),
            className,
            onClick,
            ...rest
        });
    }
});
