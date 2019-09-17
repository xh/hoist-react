/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {WebSocketModel} from '@xh/hoist/admin/tabs/general/websocket/WebSocketModel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {Icon} from '@xh/hoist/icon';
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, creates} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';

export const WebSocketPanel = hoistCmp({

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
                relativeTimestamp({timestamp: model.lastRefresh}),
                toolbarSep(),
                gridCountLabel({unit: 'client'}),
                toolbarSep(),
                storeFilterField(),
                exportButton()
            ],
            item: grid(),
            mask: model.loadModel,
            ref: model.viewRef
        });
    }
});