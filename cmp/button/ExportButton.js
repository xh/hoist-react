/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, hoistComponent} from 'hoist/core';
import {button} from 'hoist/kit/blueprint';
import {Icon} from 'hoist/icon';

/**
 * Convenience Button preconfigured for use as a trigger for an export/download of data.
 * Accepts props documented below as well as any supported by Blueprint's Button.
 *
 * Must be provided either an onClick handler *or* a model. If a model is provided, this button
 * will call export() on the model class.
 */
@hoistComponent()
export class ExportButton extends Component {

    static propTypes = {
        icon: PT.element,
        onClick: PT.func,
        model: PT.object
    };

    render() {
        const {icon, onClick, model, ...rest} = this.props;
        return button({
            icon: icon || Icon.download(),
            onClick: onClick || this.onExportClick,
            ...rest
        });
    }


    //---------------------------
    // Implementation
    //---------------------------
    onExportClick = () => {
        this.model.export();
    }

}
export const exportButton = elemFactory(ExportButton);