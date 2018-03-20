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

/**
 * Button intended for export. Defaults icon to font awesome 'download'.
 * Defaults click handler to passed model's export function
 *
 * @prop icon - a valid icon for a blueprint button
 * @prop onClick - a click handler for this button
 *
 *  ...and any other props that can be passed to a blueprint button component.
 */
@hoistComponent()
export class ExportButton extends Component {

    static defaultProps = {
        icon: Icon.download()
    }

    render() {
        return button({
            icon: this.props.icon,
            onClick: this.props.onClick || this.onExportClick
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