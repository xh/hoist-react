/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {dialog} from '@xh/hoist/kit/blueprint';
import {XH, HoistComponent, elemFactory, AppState} from '@xh/hoist/core';
import {frame, table, tbody, tr, th, td, filler} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/cmp/toolbar';
import {button} from '@xh/hoist/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {MessageModel, message} from '@xh/hoist/cmp/message';
import './AboutDialog.scss';

/**
 * Default display of application suspension.
 *
 * This display can be overridden by applications.
 * @see HoistApp.suspendedDialogClass
 *
 * @private
 */
@HoistComponent()
export class SuspendedDialog extends Component {

    localModel = new MessageModel({
        title: 'Application Sleeping',
        icon: Icon.moon(),
        message: 'This application is sleeping due to inactivity. Please click below to reload it.',
        confirmText: 'Reload',
        onConfirm: this.props.onReactivate,
        isOpen: true
    });

    render() {
        return message({model: this.model});
    }
}