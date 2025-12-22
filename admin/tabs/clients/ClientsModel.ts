/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns';
import {GridModel} from '@xh/hoist/cmp/grid';
import {div, p} from '@xh/hoist/cmp/layout';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {RecordActionSpec, StoreRecord} from '@xh/hoist/data';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {pluralize} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import {BaseAdminTabModel} from '@xh/hoist/admin/tabs/BaseAdminTabModel';

export class ClientsModel extends BaseAdminTabModel {
    @observable
    lastRefresh: number;

    @managed
    gridModel: GridModel;

    @bindable
    groupBy: 'user' | 'instance' = null;

    @managed
    private _timer: Timer;

    forceSuspendAction: RecordActionSpec = {
        text: 'Force suspend',
        icon: Icon.stopCircle(),
        intent: 'danger',
        actionFn: ({selectedRecords}) => this.forceSuspendAsync(selectedRecords),
        displayFn: () => ({hidden: AppModel.readonly}),
        recordsRequired: true
    };

    reqHealthReportAction: RecordActionSpec = {
        text: 'Request Health Report',
        icon: Icon.health(),
        actionFn: ({selectedRecords}) => this.requestHealthReportAsync(selectedRecords),
        recordsRequired: true,
        hidden: !XH.trackService.enabled
    };

    constructor() {
        super();
        makeObservable(this);

        this.gridModel = this.createGridModel();

        this._timer = Timer.create({
            runFn: async () => {
                if (this.isVisible) {
                    await this.autoRefreshAsync();
                }
            },
            interval: 5 * SECONDS,
            delay: true
        });

        this.addReaction({
            track: () => this.groupBy,
            run: () => this.applyGroupBy()
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {gridModel} = this;

        try {
            const data = await XH.fetchJson({
                url: 'clientAdmin/allClients',
                loadSpec
            });
            if (loadSpec.isStale) return;

            gridModel.loadData(data);
            gridModel.preSelectFirstAsync();
            runInAction(() => {
                this.lastRefresh = Date.now();
            });
        } catch (e) {
            if (loadSpec.isStale || loadSpec.isAutoRefresh) return;

            gridModel.clear();
            XH.handleException(e, {alertType: 'toast'});
        }
    }

    async forceSuspendAsync(toRecs: StoreRecord[]) {
        if (isEmpty(toRecs)) return;

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
                    `This action will force ${toRecs.length} connected client(s) into suspended mode, halting all background refreshes and other activity, masking the UI, and requiring users to reload the app to continue.`
                ),
                p('Enter an optional message below to display within the suspended app.')
            ),
            input: {
                item: textInput({placeholder: 'User-facing message (optional)'}),
                initialValue: null
            }
        });

        if (message !== false) {
            await this.bulkPush({
                toRecs,
                topic: XH.webSocketService.FORCE_APP_SUSPEND_TOPIC,
                message,
                trackMessage: 'Suspended clients via WebSocket'
            });
        }
    }

    async requestHealthReportAsync(toRecs: StoreRecord[]) {
        await this.bulkPush({
            toRecs,
            topic: XH.webSocketService.REQ_CLIENT_HEALTH_RPT_TOPIC
        });
        XH.successToast(
            `Client health report requested for ${pluralize('client', toRecs.length, true)} - available in User Activity shortly...`
        );
    }

    //------------------
    // Implementation
    //------------------
    private createGridModel(): GridModel {
        const hidden = true;

        return new GridModel({
            emptyText: 'No clients connected.',
            groupBy: this.groupBy,
            colChooserModel: true,
            enableExport: true,
            selModel: 'multiple',
            exportOptions: {filename: exportFilenameWithDate('clients')},
            restoreDefaultsFn: async () => this.applyGroupBy(),
            contextMenu: [
                this.forceSuspendAction,
                this.reqHealthReportAction,
                '-',
                ...GridModel.defaultContextMenu
            ],
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
            sortBy: ['user'],
            columns: [
                Col.isOpen,
                Col.user,
                {
                    headerName: 'Session',
                    headerAlign: 'center',
                    children: [
                        Col.createdTime,
                        {...Col.key, hidden},
                        Col.instance,
                        Col.loadId,
                        Col.tabId
                    ]
                },
                {
                    headerName: 'Client App',
                    headerAlign: 'center',
                    children: [Col.clientAppCode, Col.appVersion, Col.appBuild]
                },
                {
                    headerName: 'Send/Receive',
                    headerAlign: 'center',
                    children: [
                        Col.sentMessageCount,
                        Col.lastSentTime,
                        Col.receivedMessageCount,
                        Col.lastReceivedTime
                    ]
                }
            ]
        });
    }

    private async bulkPush({
        toRecs,
        topic,
        message,
        trackMessage
    }: {
        toRecs?: StoreRecord[];
        topic: string;
        message?: string;
        trackMessage?: string;
    }) {
        if (isEmpty(toRecs)) return;

        const tasks = toRecs.map(rec =>
            XH.fetchJson({
                url: 'clientAdmin/pushToClient',
                params: {
                    channelKey: rec.data.key,
                    instance: rec.data.instance,
                    topic,
                    message
                }
            })
        );

        await Promise.allSettled(tasks).track({
            category: 'Audit',
            message: trackMessage,
            data: {users: toRecs.map(it => it.data.user).sort()},
            omit: !trackMessage
        });
    }

    private applyGroupBy() {
        const {groupBy, gridModel} = this;
        gridModel.setGroupBy(groupBy);
    }
}
