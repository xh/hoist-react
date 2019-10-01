/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {button, Button} from './Button';
import {GridModel} from '@xh/hoist/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {errorIf, withDefault} from '@xh/hoist/utils/js';

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
export const [ExportButton, exportButton] = hoistCmp.withFactory({
    displayName: 'ExportButton',
    model: false,

    render({icon, title, onClick, gridModel, exportOptions = {}, disabled, ...rest}) {

        const contextGridModel = useContextModel(GridModel);

        if (!onClick) {
            gridModel = withDefault(gridModel, contextGridModel);

            errorIf(
                !gridModel || !gridModel.enableExport,
                'ExportButton must be bound to GridModel with enableExport == true, otherwise exports will not work.'
            );
            onClick = gridModel ? () => exportGridData(gridModel, exportOptions) : null;
        }

        return button({
            icon: withDefault(icon, Icon.download()),
            title: withDefault(title, 'Export'),
            onClick,
            disabled: withDefault(disabled, gridModel && gridModel.empty),
            ...rest
        });
    }
});
ExportButton.propTypes = {
    ...Button.propTypes,
    gridModel: PT.instanceOf(GridModel),
    exportOptions: PT.object
};

//---------------------------
// Implementation
//---------------------------
function exportGridData(gridModel, exportOptions) {
    gridModel.exportAsync(exportOptions).catchDefault();
}


