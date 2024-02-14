/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {WebSocketModel} from '@xh/hoist/admin/tabs/server/websocket/WebSocketModel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, box, fragment, p} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {XH, creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {AppModel} from '@xh/hoist/admin/AppModel';

export const webSocketPanel = hoistCmp.factory({
    model: creates(WebSocketModel),

    render({model}) {
        if (!XH.webSocketService.enabled) return notPresentMessage();

        return panel({
            tbar: [
                button({
                    text: 'Force suspend',
                    icon: Icon.stopCircle(),
                    intent: 'danger',
                    disabled: !model.gridModel.hasSelection,
                    omit: AppModel.readonly,
                    onClick: () => model.forceSuspendOnSelectedAsync()
                }),
                filler(),
                relativeTimestamp({bind: 'lastRefresh'}),
                toolbarSep(),
                gridCountLabel({unit: 'client'}),
                toolbarSep(),
                storeFilterField(),
                exportButton()
            ],
            item: grid(),
            mask: 'onLoad',
            ref: model.viewRef
        });
    }
});

const notPresentMessage = hoistCmp.factory(() =>
    box({
        height: 200,
        width: 1000,
        items: [
            errorMessage({
                error: {
                    message: fragment(
                        p('WebSockets are not enabled in this application.'),
                        p(
                            'Please ensure that you have enabled web sockets in your server and client application configuration.'
                        )
                    )
                }
            })
        ]
    })
);
