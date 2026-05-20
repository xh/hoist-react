/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
/// <reference path="../../../assets.d.ts" />
import {div, img, p, viewport} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import './IdlePanel.scss';
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
                testId: 'xh-idle-panel',
                item: div(
                    img({
                        src: idleImage,
                        width: 300,
                        height: 180
                    }),
                    p(
                        `${XH.clientAppName} is sleeping due to inactivity - this helps conserve resources and reduce load on both your computer and back-end systems.`
                    ),
                    p('Please click anywhere to reload.')
                ),
                bbar: [
                    button({
                        text: "I'm back!",
                        intent: 'primary',
                        minimal: false,
                        autoFocus: true,
                        width: '100%',
                        testId: 'xh-idle-reactivate-btn',
                        onClick: onReactivate
                    })
                ]
            }),
            onClick: onReactivate
        });
    }
});
