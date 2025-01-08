/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {WebSocketModel} from '@xh/hoist/admin/tabs/cluster/instances/websocket/WebSocketModel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {box, filler, fragment, p} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/cmp/error';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';

export const webSocketPanel = hoistCmp.factory({
    model: creates(WebSocketModel),

    render({model}) {
        if (!XH.webSocketService.enabled) return notPresentMessage();

        return panel({
            bbar: [
                recordActionBar({
                    selModel: model.gridModel.selModel,
                    actions: [model.forceSuspendAction]
                }),
                filler(),
                relativeTimestamp({bind: 'lastRefresh', options: {prefix: 'Refreshed'}}),
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
