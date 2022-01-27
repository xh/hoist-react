/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {XH, hoistCmp} from '@xh/hoist/core';
import {vframe, div, p} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/mobile/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';

import './SuspendPanel.scss';

/**
 * Generic Panel to display when the app is suspended.
 * @private
 */
export const suspendPanel = hoistCmp.factory({
    displayName: 'SuspendPanel',

    render() {
        const message = XH.suspendData?.message;
        return panel({
            className: 'xh-suspend-panel',
            title: `Restart ${XH.clientAppName}`,
            icon: Icon.refresh(),
            items: [
                vframe({
                    className: 'xh-suspend-panel__content',
                    items: [
                        div({
                            className: 'xh-suspend-panel__text-container',
                            items: [
                                p({item: message, omit: !message}),
                                p('Your application requires a restart.'),
                                p('Please tap below to continue.')
                            ]
                        }),
                        div({
                            className: 'xh-suspend-panel__button-container',
                            item: button({
                                text: 'Restart Now',
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
