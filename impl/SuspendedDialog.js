/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {MessageModel, message} from '@xh/hoist/cmp/message';

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