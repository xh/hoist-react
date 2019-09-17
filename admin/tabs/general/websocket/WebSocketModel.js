/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {createRef} from 'react';
import {required} from '@xh/hoist/cmp/form';
import {compactDateCol, emptyFlexCol, GridModel, numberCol} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {convertIconToSvg, Icon} from '@xh/hoist/icon';
import {action, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {isDisplayed} from '@xh/hoist/utils/js';

@HoistModel
@LoadSupport
export class WebSocketModel {

    viewRef = createRef();

    @observable
    lastRefresh;

    @managed
    gridModel = new GridModel({
        emptyText: 'No clients connected.',
        enableExport: true,
        store: {
            idSpec: 'key',
            fields: ['authUser', 'apparentUser'],
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
            }
        },
        sortBy: ['key'],
        columns: [
            {
                field: 'isOpen',
                headerName: '',
                align: 'center',
                width: 40,
                renderer: v => v ?
                    convertIconToSvg(Icon.circle({prefix: 'fas'}), {classes: ['xh-green']}) :
                    convertIconToSvg(Icon.circle({prefix: 'fal'}), {classes: ['xh-red']})
            },
            {field: 'key', width: 160},
            {field: 'user', width: 250},
            {field: 'createdTime', headerName: 'Created', ...compactDateCol},
            {field: 'sentMessageCount', headerName: 'Sent', ...numberCol, width: 90},
            {field: 'lastSentTime', headerName: 'Last Sent', ...compactDateCol, width: 140},
            {field: 'receivedMessageCount', headerName: 'Received', ...numberCol, width: 90},
            {field: 'lastReceivedTime', headerName: 'Last Received', ...compactDateCol, width: 140},
            {...emptyFlexCol}
        ]
    })

    @managed
    _timer;

    constructor() {
        this._timer = Timer.create({
            runFn: () => {
                if (isDisplayed(this.viewRef.current)) {
                    this.loadAsync({isAutoRefresh: true});
                }
            },
            interval: 5 * SECONDS,
            delay: 5 * SECONDS
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
            message: `Send an in-app alert to ${selectedRecord.authUser} with the text below.`,
            input: {
                item: textInput({autoFocus: true, selectOnFocus: true}),
                initialValue: 'This is a test alert',
                rules: [required]
            }
        });

        XH.fetchJson({
            url: 'webSocketAdmin/pushToChannel',
            params: {
                channelKey: selectedRecord.key,
                topic: XH.webSocketService.TEST_MSG_TOPIC,
                message
            }
        });
    }
}