/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {viewport, div, img, p, filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

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
        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            className: 'xh-idle-viewport',
            item: panel({
                title: `${XH.clientAppName} is sleeping`,
                icon: Icon.moon(),
                className: 'xh-idle-panel',
                item: div(
                    img({
                        src: idleImage,
                        width: 300,
                        height: 180
                    }),
                    p('This application is sleeping due to inactivity.'),
                    p('Please click below to reload it.')
                ),
                bbar: [
                    filler(),
                    button({
                        text: "I'm back!",
                        intent: 'primary',
                        minimal: false,
                        autoFocus: true,
                        onClick: onReactivate
                    })
                ]
            })
        });
    }
});
