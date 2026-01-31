/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {AppContainerModel} from '@xh/hoist/appcontainer/AppContainerModel';
import {XH, hoistCmp} from '@xh/hoist/core';
import {vframe, div, p} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/mobile/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';

import './SuspendPanel.scss';
import {idlePanel} from './IdlePanel';
import {elementFromContent} from '@xh/hoist/utils/react';

/**
 * Generic Panel to display when the app is suspended.
 * @internal
 */
export const suspendPanel = hoistCmp.factory<AppContainerModel>({
    displayName: 'SuspendPanel',

    render({model}) {
        const {suspendData} = model.appStateModel;
        if (!suspendData) return null;

        let {reason, exception, message} = suspendData;

        // 0) Special case for IDLE, including app override ability.
        if (reason === 'IDLE') {
            const content = model.appSpec.idlePanel ?? idlePanel;
            return elementFromContent(content, {onReactivate: () => XH.reloadApp()});
        }

        // 1) All Others
        let icon, title;
        switch (reason) {
            case 'APP_UPDATE':
                icon = Icon.gift();
                title = 'Application Update';
                break;
            case 'AUTH_EXPIRED':
                icon = Icon.lock();
                title = 'Authentication Expired';
                break;
            default:
                icon = Icon.refresh();
                title = 'Reload Required';
        }

        return panel({
            className: 'xh-suspend-panel',
            title,
            icon,
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
                            items: [
                                button({
                                    text: 'Reload Now',
                                    icon: Icon.refresh(),
                                    intent: 'primary',
                                    flex: 1,
                                    onClick: () => XH.reloadApp()
                                }),
                                button({
                                    text: 'More Details',
                                    icon: Icon.detail(),
                                    minimal: true,
                                    omit: !exception,
                                    onClick: () =>
                                        XH.exceptionHandler.showExceptionDetails(exception)
                                })
                            ]
                        })
                    ]
                })
            ]
        });
    }
});
