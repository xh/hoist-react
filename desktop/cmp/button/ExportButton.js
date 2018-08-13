/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {button} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience Button preconfigured for use as a trigger for an export/download of data.
 *
 * Must be provided either an onClick handler *or* a model. If a model is provided, this button
 * will call export() on the model class.
 */
@HoistComponent()
export class ExportButton extends Component {

    static propTypes = {
        icon: PT.element,
        title: PT.string,
        onClick: PT.func,
        model: PT.object,
        exportType: PT.string
    };

    render() {
        const {icon, onClick, exportType, ...rest} = this.props;
        return button({
            icon: icon || Icon.download(),
            title: this.title || 'Export',
            onClick: onClick || this.onExportClick,
            ...rest
        });
    }


    //---------------------------
    // Implementation
    //---------------------------
    onExportClick = () => {
        const type = this.props.exportType;
        this.model.export({type});
    }

}
export const exportButton = elemFactory(ExportButton);