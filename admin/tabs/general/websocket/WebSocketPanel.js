/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {WebSocketModel} from '@xh/hoist/admin/tabs/general/websocket/WebSocketModel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';

export const webSocketPanel = hoistCmp.factory({

    model: creates(WebSocketModel),

    render({model}) {
        return panel({
            tbar: [
                button({
                    text: 'Send test alert',
                    icon: Icon.bullhorn(),
                    intent: 'primary',
                    disabled: !model.gridModel.selectedRecord,
                    onClick: () => model.sendAlertToSelectedAsync()
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