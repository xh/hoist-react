/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import {XH, hoistCmp} from '@xh/hoist/core';
import {vframe, div, p} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/mobile/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';

import './SuspendPanel.scss';

/**
 * Generic Panel to display when the app is suspended.
 * @internal
 */
export const suspendPanel = hoistCmp.factory<AppContainerModel>({
    displayName: 'SuspendPanel',

    render({model}) {
        const message = model.appStateModel.suspendData?.message;
        return panel({
            className: 'xh-suspend-panel',
            title: `Reload Required`,
            icon: Icon.refresh(),
            items: [
                vframe({
                    className: 'xh-suspend-panel__content',
                    items: [
                        div({
                            className: 'xh-suspend-panel__text-container',
                            items: [
                                p({item: message, omit: !message}),
                                p(`${XH.clientAppName} must be reloaded to continue.`)
                            ]
                        }),
                        div({
                            className: 'xh-suspend-panel__button-container',
                            item: button({
                                text: 'Reload Now',
                                icon: Icon.refresh(),
                                intent: 'primary',
                                flex: 1,
                                onClick: () => XH.reloadApp()
                            })
                        })
                    ]
                })
            ]
        });
    }
});
