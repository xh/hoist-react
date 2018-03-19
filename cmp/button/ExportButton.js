/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {button} from 'hoist/kit/blueprint';
import {Icon} from 'hoist/icon';

@hoistComponent()
export class ExportButton extends Component {

    render() {
        return button({
            icon: Icon.download(),
            onClick: this.onExportClick
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    onExportClick = () => {
        this.props.model.exportGrid();
    }

}
export const exportButton = elemFactory(ExportButton);