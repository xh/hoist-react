/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import {hoistCmp, XH} from '@xh/hoist/core';
import {viewport, div, p, filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import './SuspendPanel.scss';

/**
 * Generic Panel to display when the app is suspended.
 * @internal
 */
export const suspendPanel = hoistCmp.factory<AppContainerModel>({
    displayName: 'SuspendPanel',

    render({model}) {
        const message = model.appStateModel.suspendData?.message;
        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            className: 'xh-suspend-viewport',
            item: panel({
                title: `Reload Required`,
                icon: Icon.refresh(),
                className: 'xh-suspend-panel',
                item: div({
                    className: 'xh-suspend-panel__inner',
                    items: [
                        p({item: message, omit: !message}),
                        p(`${XH.clientAppName} must be reloaded to continue.`)
                    ]
                }),
                bbar: [
                    filler(),
                    button({
                        text: 'Reload now',
                        icon: Icon.refresh(),
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
