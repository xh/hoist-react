/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {hoistComponent} from '@xh/hoist/core';
import {button, Button} from './Button';
import {GridModel} from '@xh/hoist/cmp/grid';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience Button preconfigured for use as a trigger for an export/download of data.
 *
 * Must be provided either an onClick handler *or* a gridModel. If a model is provided, this button
 * will call exportAsync() on the model class. Options supported by GridExportService.exportAsync()
 * can be set via the exportOptions props.
 *
 * Requires the `GridModel.enableExport` config option to be true.
 */
export const [ExportButton, exportButton] = hoistComponent(
    ({gridModel, exportOptions = {}, ...buttonProps}) => {
        return button({
            icon: Icon.download(),
            title: 'Export',
            onClick: () => gridModel.exportAsync(exportOptions).catchDefault(),
            ...buttonProps
        });
    }
);

ExportButton.propTypes = {
    ...Button.propTypes,
    gridModel: PT.instanceOf(GridModel),
    exportOptions: PT.object
};