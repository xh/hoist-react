/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {compactDateCol, GridModel, numberCol} from '@xh/hoist/cmp/grid';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {required} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {isDisplayed} from '@xh/hoist/utils/js';
import {createRef} from 'react';

export class WebSocketModel extends HoistModel {

    viewRef = createRef();

    @observable
    lastRefresh;

    @managed
    gridModel = new GridModel({
        emptyText: 'No clients connected.',
        enableExport: true,
        store: {
            idSpec: 'key',
            processRawData: row => {
                const authUser = row.authUser.username,
                    apparentUser = row.apparentUser.username,
                    impersonating = authUser != apparentUser;

                return {
                    ...row,
                    authUser,
                    apparentUser,
                    user: impersonating ? `${authUser} (as ${apparentUser})` : authUser
                };
            },
            fields: [
                {name: 'isOpen', type: 'bool'},
                {name: 'createdTime', type: 'date', displayName: 'Created'},
                {name: 'sentMessageCount', type: 'int', displayName: 'Sent'},
                {name: 'lastSentTime', type: 'date', displayName: 'Last Sent'},
                {name: 'receivedMessageCount', type: 'int', displayName: 'Received'},
                {name: 'lastReceivedTime', type: 'date', displayName: 'Last Received'},
                {name: 'authUser', type: 'string'},
                {name: 'apparentUser', type: 'string'}
            ]
        },
        sortBy: ['key'],
        columns: [
            {
                field: 'isOpen',
                headerName: '',
                align: 'center',
                width: 40,
                renderer: v => v ?
                    Icon.circle({prefix: 'fas', className: 'xh-green', asHtml: true}) :
                    Icon.circle({prefix: 'fal', className: 'xh-red', asHtml: true})
            },
            {field: 'key', width: 160},
            {field: 'user', width: 250},
            {field: 'createdTime', ...compactDateCol},
            {field: 'sentMessageCount', ...numberCol, width: 90},
            {field: 'lastSentTime', ...compactDateCol, width: 140},
            {field: 'receivedMessageCount', ...numberCol, width: 90},
            {field: 'lastReceivedTime', ...compactDateCol, width: 140}
        ]
    })

    @managed
    _timer;

    constructor() {
        super();
        makeObservable(this);
        this._timer = Timer.create({
            runFn: () => {
                if (isDisplayed(this.viewRef.current)) {
                    this.autoRefreshAsync();
                }
            },
            interval: 5 * SECONDS,
            delay: true
        });
    }

    async doLoadAsync() {
        const data = await XH.fetchJson({url: 'webSocketAdmin/allChannels'});
        this.gridModel.loadData(data);
        this.updateRefreshTime();
    }

    @action
    updateRefreshTime() {
        this.lastRefresh = Date.now();
    }

    async sendAlertToSelectedAsync() {
        const {selectedRecord} = this.gridModel;
        if (!selectedRecord) return;

        const message = await XH.prompt({
            title: 'Send test alert',
            icon: Icon.bullhorn(),
            confirmProps: {text: 'Send'},
            message: `Send an in-app alert to ${selectedRecord.data.authUser} with the text below.`,
            input: {
                item: textInput({autoFocus: true, selectOnFocus: true}),
                initialValue: 'This is a test alert',
                rules: [required]
            }
        });

        XH.fetchJson({
            url: 'webSocketAdmin/pushToChannel',
            params: {
                channelKey: selectedRecord.data.key,
                topic: XH.webSocketService.TEST_MSG_TOPIC,
                message
            }
        });
    }
}
