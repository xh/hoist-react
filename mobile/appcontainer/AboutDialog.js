/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {Icon} from '@xh/hoist/icon';

import './AboutDialog.scss';

/**
 * A dialog box showing basic metadata and version information about the Hoist application
 * and its plugins. Can also display the values of other soft-configuration entries as
 * specified by the xhAboutMenuConfigs configuration key.
 *
 * @private
 */
@HoistComponent()
export class AboutDialog extends Component {

    render() {
        const {model} = this;
        if (!model.isOpen) return null;

        return dialog({
            icon: Icon.info(),
            title: `About ${XH.appName}`,
            cls: 'xh-about-dialog',
            isOpen: true,
            onCancel: this.onClose,
            content: model.getTable()
        });
    }

    //------------------------
    // Implementation
    //------------------------
    onClose = () => {
        this.model.hide();
    }
}
export const aboutDialog = elemFactory(AboutDialog);