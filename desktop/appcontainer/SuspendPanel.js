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

import './SuspendPanel.scss';

/**
 * Generic Panel to display when the app is suspended.
 * @private
 */
export const suspendPanel = hoistCmp.factory({
    displayName: 'SuspendPanel',

    render() {
        const message = XH.suspendData?.message
        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            className: 'xh-suspend-viewport',
            item: panel({
                title: `Restart ${XH.clientAppName}`,
                icon: Icon.refresh(),
                className: 'xh-suspend-panel',
                item: div(
                    p({item: message, omit: !message}),
                    p('Your application requires a restart.'),
                    p('Please click restart to continue.')
                ),
                bbar: [
                    filler(),
                    button({
                        text: 'Restart now',
                        intent: 'primary',
                        minimal: false,
                        autoFocus: true,
                        onClick: () => XH.reloadApp()
                    })
                ]
            })
        });
    }
});
