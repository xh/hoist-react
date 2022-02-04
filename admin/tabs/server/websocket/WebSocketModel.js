/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {div, p} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {GridModel} from '@xh/hoist/cmp/grid';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {isDisplayed} from '@xh/hoist/utils/js';
import * as Col from '@xh/hoist/admin/columns';
import {isEmpty} from 'lodash';
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
            selModel: 'multiple',
            store: {
                idSpec: 'key',
                processRawData: row => {
                    const authUser = row.authUser.username,
                        apparentUser = row.apparentUser.username,
                        impersonating = authUser !== apparentUser;

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

    async forceSuspendOnSelectedAsync() {
        const {selectedRecords} = this.gridModel;
        if (isEmpty(selectedRecords)) return;

        const message = await XH.prompt({
            title: 'Force suspend',
            icon: Icon.stopCircle(),
            confirmProps: {text: 'Force Suspend', icon: Icon.stopCircle(), intent: 'danger'},
            cancelProps: {autoFocus: true},
            message: div(
                p(`This action will force ${selectedRecords.length} connected client(s) into suspended mode, halting all background refreshes and other activity, masking the UI, and requiring users to reload the app to continue.`),
                p('If desired, you can enter a message below to display within the suspended app.')
            ),
            input: {
                item: textInput({placeholder: 'User-facing message (optional)'}),
                initialValue: null
            }
        });

        if (message !== false) {
            const tasks = selectedRecords
                .map((rec) => XH.fetchJson({
                    url: 'webSocketAdmin/pushToChannel',
                    params: {
                        channelKey: rec.data.key,
                        topic: XH.webSocketService.FORCE_APP_SUSPEND_TOPIC,
                        message
                    }
                }));

            await Promise.allSettled(tasks).track({
                category: 'Audit',
                message: 'Suspended clients via WebSocket',
                data: {users: selectedRecords.map(it => it.data.user).sort()}
            });
        }
    }
}
