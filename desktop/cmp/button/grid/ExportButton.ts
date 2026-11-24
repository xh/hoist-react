/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridLikeModel} from '@xh/hoist/cmp/grid';
import {isGridLikeModel} from '@xh/hoist/cmp/grid/impl/GridLikeModel';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import type {ExportOptions} from '@xh/hoist/svc';
import {logError} from '@xh/hoist/utils/js';
import type {ButtonProps} from '../Button';
import {button} from '../Button';

const EXPORT_TYPE_LABELS: Record<Required<ExportOptions>['type'], string> = {
    excel: 'Excel',
    excelTable: 'Excel',
    csv: 'CSV'
};

export interface ExportButtonProps extends ButtonProps {
    /**
     * GridModel, ZoneGridModel or CubeGridModel to which this button should bind. Will find the
     * nearest in context if not provided.
     */
    gridModel?: GridLikeModel;

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
        {
            className,
            title,
            tooltip,
            onClick,
            gridModel: boundModel,
            exportOptions = {},
            disabled,
            ...rest
        },
        ref
    ) {
        const contextModel = useContextModel<GridLikeModel>(isGridLikeModel),
            gridModel = (boundModel ?? contextModel)?.innerGridModel;

        if (!onClick) {
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

        if (!title && !tooltip) {
            const exportType = exportOptions.type ?? gridModel?.exportOptions?.type ?? 'excelTable';
            tooltip = `Export to ${EXPORT_TYPE_LABELS[exportType]}`;
        }

        return button({
            ref,
            icon: Icon.download(),
            title,
            tooltip,
            disabled: disabled ?? gridModel?.empty,
            className,
            onClick,
            ...rest
        });
    }
});
