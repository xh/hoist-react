/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import * as Col from '@xh/hoist/admin/columns';
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/BaseInstanceModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import {div, p} from '@xh/hoist/cmp/layout';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {isDisplayed} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import {createRef} from 'react';
import * as WSCol from './WebSocketColumns';
import {RecordActionSpec} from '@xh/hoist/data';
import {AppModel} from '@xh/hoist/admin/AppModel';

export class WebSocketModel extends BaseInstanceModel {
    viewRef = createRef<HTMLElement>();

    @observable
    lastRefresh: number;

    @managed
    gridModel: GridModel;

    @managed
    private _timer: Timer;

    forceSuspendAction: RecordActionSpec = {
        text: 'Force suspend',
        icon: Icon.stopCircle(),
        intent: 'danger',
        actionFn: () => this.forceSuspendAsync(),
        displayFn: () => ({hidden: AppModel.readonly}),
        recordsRequired: true
    };

    constructor() {
        super();
        makeObservable(this);

        this.gridModel = new GridModel({
            emptyText: 'No clients connected.',
            enableExport: true,
            exportOptions: {filename: exportFilenameWithDate('ws-connections')},
            selModel: 'multiple',
            contextMenu: [this.forceSuspendAction, '-', ...GridModel.defaultContextMenu],
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

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const data = await XH.fetchJson({
                url: 'webSocketAdmin/allChannels',
                params: {instance: this.instanceName},
                loadSpec
            });
            this.gridModel.loadData(data);
            runInAction(() => {
                this.lastRefresh = Date.now();
            });
        } catch (e) {
            this.handleLoadException(e, loadSpec);
        }
    }

    async forceSuspendAsync() {
        const {selectedRecords} = this.gridModel;
        if (isEmpty(selectedRecords)) return;

        const message = await XH.prompt<string>({
            title: 'Please confirm...',
            icon: Icon.warning(),
            confirmProps: {
                text: 'Force Suspend',
                icon: Icon.stopCircle(),
                intent: 'danger',
                outlined: true,
                autoFocus: false
            },
            message: div(
                p(
                    `This action will force ${selectedRecords.length} connected client(s) into suspended mode, halting all background refreshes and other activity, masking the UI, and requiring users to reload the app to continue.`
                ),
                p('Enter an optional message below to display within the suspended app.')
            ),
            input: {
                item: textInput({placeholder: 'User-facing message (optional)'}),
                initialValue: null
            }
        });

        if (message !== false) {
            const tasks = selectedRecords.map(rec =>
                XH.fetchJson({
                    url: 'webSocketAdmin/pushToChannel',
                    params: {
                        channelKey: rec.data.key,
                        topic: XH.webSocketService.FORCE_APP_SUSPEND_TOPIC,
                        instance: this.instanceName,
                        message
                    }
                })
            );

            await Promise.allSettled(tasks).track({
                category: 'Audit',
                message: 'Suspended clients via WebSocket',
                data: {users: selectedRecords.map(it => it.data.user).sort()}
            });
        }
    }
}
