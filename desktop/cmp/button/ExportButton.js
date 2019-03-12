/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {button, Button} from '@xh/hoist/desktop/cmp/button';
import {GridModel} from '@xh/hoist/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * Convenience Button preconfigured for use as a trigger for an export/download of data.
 *
 * Must be provided either an onClick handler *or* a model. If a model is provided, this button
 * will call exportAsync() on the model class. Options supported by GridExportService.exportAsync()
 * can be set via the exportOptions props.
 *
 * Requires the `GridModel.enableExport` config option to be true.
 */
@HoistComponent
export class ExportButton extends Component {

    static propTypes = {
        ...Button.propTypes,
        gridModel: PT.instanceOf(GridModel),
        exportOptions: PT.object
    };

    render() {
        const {icon, title, onClick, gridModel, exportOptions, ...rest} = this.props;
        return button({
            icon: withDefault(icon, Icon.download()),
            title: withDefault(title, 'Export'),
            onClick: withDefault(onClick, this.exportGridData),
            ...rest
        });
    }


    //---------------------------
    // Implementation
    //---------------------------
    exportGridData = () => {
        const {gridModel, exportOptions = {}} = this.props;
        gridModel.exportAsync(exportOptions).catchDefault();
    }

}
export const exportButton = elemFactory(ExportButton);
