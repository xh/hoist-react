/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {XH, hoistCmp} from '@xh/hoist/core';
import {vframe, div, img, p} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/mobile/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';

import './IdlePanel.scss';

// @ts-ignore
import idleImage from './IdlePanelImage.png';

/**
 * Default panel to display when the app has suspended itself due to inactivity.
 * This display can be overridden by applications.
 * @see AppSpec.idlePanel
 * @internal
 */
export const idlePanel = hoistCmp.factory({
    displayName: 'IdlePanel',

    render({onReactivate}) {
        return panel({
            className: 'xh-idle-panel',
            title: `${XH.clientAppName} is sleeping`,
            icon: Icon.moon(),
            items: [
                img({src: idleImage}),
                vframe({
                    className: 'xh-idle-panel__content',
                    items: [
                        div({
                            className: 'xh-idle-panel__text-container',
                            items: [
                                p('This application is sleeping due to inactivity.'),
                                p('Please click below to reload it.')
                            ]
                        }),
                        div({
                            className: 'xh-idle-panel__button-container',
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
});
