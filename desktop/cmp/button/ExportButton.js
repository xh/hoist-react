/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience Button preconfigured for use as a trigger for an export/download of data.
 *
 * Must be provided either an onClick handler *or* a model. If a model is provided, this button
 * will call export() on the model class. Options supported by by GridModel.export can be set
 * via the exportOptions props.
 */
@HoistComponent
export class ExportButton extends Component {

    static propTypes = {
        icon: PT.element,
        title: PT.string,
        onClick: PT.func,
        model: PT.object,
        exportOptions: PT.object
    };

    render() {
        const {icon, title, onClick, model, exportOptions, ...rest} = this.props;
        return button({
            icon: icon || Icon.download(),
            title: title || 'Export',
            onClick: onClick || this.onExportClick,
            ...rest
        });
    }


    //---------------------------
    // Implementation
    //---------------------------
    onExportClick = () => {
        const {exportOptions = {}} = this.props;
        this.model.export(exportOptions);
    }

}
export const exportButton = elemFactory(ExportButton);