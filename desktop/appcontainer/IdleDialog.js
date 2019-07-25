/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {div, img, p} from '@xh/hoist/cmp/layout';
import {HoistComponent, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {Component} from 'react';
import './IdleDialog.scss';
import idleImage from './IdleDialogImage.png';
import {message} from './Message';

/**
 * Default dialog to display when the app has suspended itself due to inactivity.
 *
 * This display can be overridden by applications.
 * @see AppSpec.idleDialogClass
 *
 * @private
 */
@HoistComponent
export class IdleDialog extends Component {

    render() {
        return message({
            model: {
                title: `${XH.clientAppName} is sleeping`,
                icon: Icon.moon(),
                message: div({
                    items: [
                        img({
                            src: idleImage,
                            width: 300,
                            height: 180
                        }),
                        p('This application is sleeping due to inactivity.'),
                        p('Please click below to reload it.')
                    ]
                }),
                confirmIntent: 'primary',
                confirmText: 'I\'m back',
                onConfirm: this.props.onReactivate
            },
            className: 'xh-idle-dialog'
        });
    }
}