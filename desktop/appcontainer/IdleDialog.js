/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistComponent, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {message} from './Message';
import {div, img, p} from '@xh/hoist/cmp/layout';
import './IdleDialog.scss';
import idleImage from './IdleDialogImage.png';


/**
 * Default display of application suspension.
 *
 * This display can be overridden by applications.
 * @see AppSpec.idleDialogClass
 *
 * @private
 */
export const [IdleDialog, idleDialog] = hoistComponent(props => {
    return message({
        model: {
            title: `${XH.clientAppName} is sleeping`,
            icon: Icon.moon(),
            message: div(
                img({
                    src: idleImage,
                    width: 300,
                    height: 180
                }),
                p('This application is sleeping due to inactivity.'),
                p('Please click below to reload it.')
            ),
            confirmIntent: 'primary',
            confirmText: 'I\'m back',
            onConfirm: props.onReactivate
        },
        className: 'xh-idle-dialog'
    });
});