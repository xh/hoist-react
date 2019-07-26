/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {WebSocketModel} from '@xh/hoist/admin/tabs/general/websocket/WebSocketModel';
import {grid} from '@xh/hoist/cmp/grid';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {Icon} from '@xh/hoist/icon';
import {filler} from '@xh/hoist/cmp/layout';
import {HoistComponent} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {storeCountLabel, storeFilterField} from '@xh/hoist/desktop/cmp/store';
import {toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Component} from 'react';

@HoistComponent
export class WebSocketPanel extends Component {

    model = new WebSocketModel(this);

    render() {
        const {model} = this,
            {gridModel} = model;

        return panel({
            tbar: [
                button({
                    text: 'Send test alert',
                    icon: Icon.bullhorn(),
                    intent: 'primary',
                    disabled: !gridModel.selectedRecord,
                    onClick: () => model.sendAlertToSelectedAsync()
                }),
                filler(),
                relativeTimestamp({timestamp: model.lastRefresh}),
                toolbarSep(),
                storeCountLabel({gridModel, unit: 'client'}),
                toolbarSep(),
                storeFilterField({gridModel}),
                exportButton({gridModel})
            ],
            item: grid({model: gridModel}),
            mask: model.loadModel
        });
    }
}