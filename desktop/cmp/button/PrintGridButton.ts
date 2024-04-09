/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {DataViewModel} from '@xh/hoist/cmp/dataview';
import {GridModel} from '@xh/hoist/cmp/grid';
import {ZoneGridModel} from '@xh/hoist/cmp/zoneGrid';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {errorIf, withDefault} from '@xh/hoist/utils/js';
import {button, ButtonProps} from './Button';

export interface PrintGridButtonProps extends ButtonProps {
    gridModel?: GridModel;
    /** True to enable activity tracking of exports (default false). */
    track?: boolean;
}

/**
 * Convenience Button preconfigured for use as a trigger for an export/download of data.
 *
 * Must be provided either an onClick handler *or* a gridModel.  GridModel may be provided
 * in props, or otherwise will be looked up by this model from context.
 *
 * If a gridModel is provided, this button will call exportAsync() on the model class.
 * Options supported by GridExportService.exportAsync() can be set via the exportOptions
 * props.
 *
 * Requires the `GridModel.enableExport` config option to be true.
 */
export const [PrintGridButton, printGridButton] = hoistCmp.withFactory<PrintGridButtonProps>({
    displayName: 'PrintGridButton',
    model: false,

    render({icon, title, onClick, gridModel, track, disabled, ...rest}, ref) {
        const contextGridModel = useContextModel(model => {
            return (
                model instanceof GridModel ||
                model instanceof ZoneGridModel ||
                model instanceof DataViewModel
            );
        });

        if (!onClick) {
            gridModel = withDefault(gridModel, contextGridModel);

            errorIf(
                !gridModel,
                'PrintGridButton must be bound to GridModel, otherwise printing will not work.'
            );
            onClick = gridModel ? () => gridModel.print() : null;
        }

        return button({
            ref,
            icon: withDefault(icon, Icon.print()),
            title: withDefault(title, 'Print Grid'),
            onClick,
            disabled: withDefault(
                disabled,
                gridModel && (gridModel.empty || !gridModel.hasPrintSupport)
            ),
            ...rest
        });
    }
});
