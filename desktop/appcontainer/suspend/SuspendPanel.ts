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
import {idlePanel} from './IdlePanel';

import './SuspendPanel.scss';
import {elementFromContent} from '@xh/hoist/utils/react';

/**
 * Display when the app is suspended.
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

        return viewport({
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            className: 'xh-suspend-viewport',
            item: panel({
                title,
                icon,
                className: 'xh-suspend-panel',
                item: div({
                    className: 'xh-suspend-panel__inner',
                    items: [
                        p({item: message, omit: !message}),
                        p(`${XH.clientAppName} must be reloaded to continue.`)
                    ]
                }),
                bbar: [
                    button({
                        text: 'More Details',
                        icon: Icon.detail(),
                        minimal: true,
                        omit: !exception,
                        onClick: () => XH.exceptionHandler.showExceptionDetails(exception)
                    }),
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
