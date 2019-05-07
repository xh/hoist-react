/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {dialog} from '@xh/hoist/kit/blueprint';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {vframe, filler} from '@xh/hoist/cmp/layout';

import {AboutDialogModel} from '@xh/hoist/core/appcontainer/AboutDialogModel';
import './AboutDialog.scss';

/**
 * A dialog box showing basic metadata and version information about the Hoist application
 * and its plugins. Can also display the values of other soft-configuration entries as
 * specified by the xhAboutMenuConfigs configuration key.
 *
 * @private
 */
@HoistComponent
export class AboutDialog extends Component {

    static modelClass = AboutDialogModel;

    render() {
        const {model} = this;
        if (!model.isOpen) return null;

        return dialog({
            isOpen: true,
            isCloseButtonShown: false,
            icon: Icon.info({size: 'lg'}),
            className: 'xh-about-dialog',
            title: `About ${XH.appName}`,
            style: {width: 450},
            items: [
                vframe({
                    className: 'xh-about-dialog__inner',
                    item: model.getTable()
                }),
                toolbar({
                    items: [
                        filler(),
                        button({
                            text: 'Close',
                            intent: 'primary',
                            onClick: this.onClose
                        })
                    ]
                })
            ],
            onClose: this.onClose
        });
    }

    onClose = () => {
        this.model.hide();
    }
}
export const aboutDialog = elemFactory(AboutDialog);