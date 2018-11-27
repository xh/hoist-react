/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {button} from '@xh/hoist/mobile/cmp/button';

import './FeedbackDialog.scss';

/**
 * Display Options dialog
 *
 * @private
 */
@HoistComponent
export class OptionsDialog extends Component {

    render() {
        const {model} = this;
        if (!model.isOpen) return null;

        return dialog({
            title: 'Options',
            icon: Icon.gear(),
            className: 'xh-options-dialog',
            isOpen: true,
            onCancel: this.onCancelClick,
            buttons: [
                button({
                    text: 'Cancel',
                    modifier: 'quiet',
                    onClick: this.onCancelClick
                }),
                button({
                    text: 'Send',
                    onClick: this.onSendClick
                })
            ]
        });
    }

    onSendClick = () => {

    }

    onCancelClick = () => {
        this.model.hide();
    }
}
export const optionsDialog = elemFactory(OptionsDialog);
