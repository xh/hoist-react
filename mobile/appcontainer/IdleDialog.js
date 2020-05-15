/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import ReactDOM from 'react-dom';
import {XH, hoistCmp} from '@xh/hoist/core';
import {vframe, div, img, p} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/mobile/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';

import './IdleDialog.scss';
import idleImage from './IdleDialogImage.png';

/**
 * Default dialog to display when the app has suspended itself due to inactivity.
 * This display can be overridden by applications - {@see AppSpec.idleDialogClass}. *
 * @private
 */
export const IdleDialog = hoistCmp({
    displayName: 'IdleDialog',

    render({onReactivate}) {
        return ReactDOM.createPortal(idleDialogPanel({onReactivate}), document.body);
    }
});

const idleDialogPanel = hoistCmp.factory(
    ({onReactivate}) => {
        return panel({
            className: 'xh-idle-dialog',
            title: `${XH.clientAppName} is sleeping`,
            icon: Icon.moon(),
            items: [
                img({src: idleImage}),
                vframe({
                    className: 'xh-idle-dialog__content',
                    items: [
                        div({
                            className: 'xh-idle-dialog__text-container',
                            items: [
                                p('This application is sleeping due to inactivity.'),
                                p('Please click below to reload it.')
                            ]
                        }),
                        div({
                            className: 'xh-idle-dialog__button-container',
                            item: button({
                                text: "I'm back!",
                                flex: 1,
                                onClick: onReactivate
                            })
                        })
                    ]
                })
            ]
        });
    }
);