/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {hoistComponent, elemFactory} from '@xh/hoist/core';
import {button, Button} from './Button';
import {GridModel} from '@xh/hoist/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {warnIf, withDefault} from '@xh/hoist/utils/js';

/**
 * Convenience Button preconfigured for use as a trigger for an export/download of data.
 *
 * Must be provided either an onClick handler *or* a gridModel. If a model is provided, this button
 * will call exportAsync() on the model class. Options supported by GridExportService.exportAsync()
 * can be set via the exportOptions props.
 *
 * Requires the `GridModel.enableExport` config option to be true.
 */
export const ExportButton = hoistComponent({
    displayName: 'ExportButton',

    render({icon, title, onClick, gridModel, exportOptions = {}, disabled, ...rest}) {

        warnIf(
            (gridModel && !gridModel.enableExport),
            'ExportButton bound to GridModel with enableExport != true - exports will not work.'
        );

        return button({
            icon: withDefault(icon, Icon.download()),
            title: withDefault(title, 'Export'),
            onClick: withDefault(onClick, () => exportGridData(gridModel, exportOptions)),
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

export const exportButton = elemFactory(ExportButton);

//---------------------------
// Implementation
//---------------------------
function exportGridData(gridModel, exportOptions) {
    gridModel.exportAsync(exportOptions).catchDefault();
}


