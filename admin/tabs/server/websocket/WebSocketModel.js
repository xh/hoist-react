/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {GridModel} from '@xh/hoist/cmp/grid';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {required} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {isDisplayed} from '@xh/hoist/utils/js';
import {
    apparentUserField,
    authUserField,
    createdTimeCol,
    createdTimeField,
    isOpenCol,
    isOpenField,
    keyCol,
    keyField,
    lastReceivedTimeCol,
    lastReceivedTimeField,
    lastSentTimeCol,
    lastSentTimeField,
    receivedMessageCountCol,
    receivedMessageCountField,
    sentMessageCountCol,
    sentMessageCountField,
    userCol,
    userField
} from '@xh/hoist/admin/columns';
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
                isOpenField,
                keyField,
                createdTimeField,
                sentMessageCountField,
                lastSentTimeField,
                receivedMessageCountField,
                lastReceivedTimeField,
                userField,
                authUserField,
                apparentUserField
            ]
        },
        sortBy: ['key'],
        columns: [
            isOpenCol,
            keyCol,
            userCol,
            createdTimeCol,
            sentMessageCountCol,
            lastSentTimeCol,
            receivedMessageCountCol,
            lastReceivedTimeCol
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
