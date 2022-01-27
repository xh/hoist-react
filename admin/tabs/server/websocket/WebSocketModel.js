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
import * as Col from '@xh/hoist/admin/columns';
import {createRef} from 'react';
import * as WSCol from './WebSocketColumns';

export class WebSocketModel extends HoistModel {

    viewRef = createRef();

    @observable
    lastRefresh;

    @managed
    gridModel;

    @managed
    _timer;

    constructor() {
        super();
        makeObservable(this);

        this.gridModel = new GridModel({
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
                    {name: 'authUser', type: 'string'},
                    {name: 'apparentUser', type: 'string'}
                ]
            },
            sortBy: ['key'],
            columns: [
                WSCol.isOpen,
                WSCol.key,
                Col.user,
                WSCol.createdTime,
                WSCol.sentMessageCount,
                WSCol.lastSentTime,
                WSCol.receivedMessageCount,
                WSCol.lastReceivedTime
            ]
        });

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

    async forceSuspendOnSelectedAsync() {
        const {selectedRecord} = this.gridModel;
        if (!selectedRecord) return;

        await XH.confirm({
            title: 'Force suspend',
            icon: Icon.stopCircle(),
            confirmProps: {text: 'Force Suspend'},
            message: `Force suspend for user ${selectedRecord.data.authUser}?`
        });

        XH.fetchJson({
            url: 'webSocketAdmin/pushToChannel',
            params: {
                channelKey: selectedRecord.data.key,
                topic: XH.webSocketService.FORCE_APP_SUSPEND_TOPIC,
                message: null
            }
        });
    }
}
