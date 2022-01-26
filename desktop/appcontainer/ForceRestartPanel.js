/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {viewport, div, p, filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './ForceRestartPanel.scss';

/**
 * Default panel to display when the app is required to reload.
 * This display can be overridden by applications - {@see AppSpec.forceRestartPanel}. *
 * @private
 */
export const forceRestartPanel = hoistCmp.factory({
    displayName: 'ForceRestartPanel',

    render({onRestart}) {
        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            className: 'xh-force-restart-viewport',
            item: panel({
                title: `Restart ${XH.clientAppName}`,
                icon: Icon.refresh(),
                className: 'xh-force-restart-panel',
                item: div(
                    p('A critical update requiring an app restart has been released.'),
                    p('Please restart your app to continue.')
                ),
                bbar: [
                    filler(),
                    button({
                        text: 'Restart now',
                        intent: 'primary',
                        minimal: false,
                        autoFocus: true,
                        onClick: onRestart
                    })
                ]
            })
        });
    }
});
