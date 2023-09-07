/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {hzObjectPanel} from '@xh/hoist/admin/tabs/server/hzobject/HzObjectPanel';
import {hibernatePanel} from '@xh/hoist/admin/tabs/server/hibernate/HibernatePanel';
import {connPoolMonitorPanel} from '@xh/hoist/admin/tabs/server/connectionpool/ConnPoolMonitorPanel';
import {serverEnvPanel} from '@xh/hoist/admin/tabs/server/environment/ServerEnvPanel';
import {logViewer} from '@xh/hoist/admin/tabs/server/logViewer/LogViewer';
import {memoryMonitorPanel} from '@xh/hoist/admin/tabs/server/memory/MemoryMonitorPanel';
import {servicePanel} from '@xh/hoist/admin/tabs/server/services/ServicePanel';
import {adminDateTimeSec} from '@xh/hoist/admin/tabs/server/Utils';
import {webSocketPanel} from '@xh/hoist/admin/tabs/server/websocket/WebSocketPanel';
import {GridModel, numberCol} from '@xh/hoist/cmp/grid';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, managed, PlainObject, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import * as MCol from '../monitor/MonitorColumns';
import {badge} from '@xh/hoist/cmp/badge';
import {hbox} from '@xh/hoist/cmp/layout';
import {ReactNode} from 'react';

export class ServerTabModel extends HoistModel {
    shutdownAction: RecordActionSpec = {
        icon: Icon.skull(),
        text: 'Shutdown Instance',
        intent: 'danger',
        actionFn: ({record}) => this.shutdownInstanceAsync(record.data),
        displayFn: () => ({hidden: AppModel.readonly}),
        recordsRequired: 1
    };

    @managed gridModel: GridModel = this.createGridModel();
    @managed tabModel: TabContainerModel = this.createTabModel();

    get instance(): PlainObject {
        return this.gridModel.selectedRecord?.data;
    }

    get instanceName(): string {
        return this.instance?.name;
    }

    get isMultiInstance(): boolean {
        return this.gridModel.store.allCount > 1;
    }

    override async doLoadAsync() {
        const {gridModel} = this;
        let data = await XH.fetchJson({url: 'clusterAdmin/allInstances'});
        data = data.map(row => ({
            ...row,
            usedHeapMb: row.memory.usedHeapMb,
            usedPctMax: row.memory.usedPctMax
        }));

        gridModel.loadData(data);
        gridModel.preSelectFirstAsync();
    }

    constructor() {
        super();
        this.addReaction({
            track: () => this.instance,
            run: () => {
                if (this.instance) this.tabModel.refreshContextModel.refreshAsync();
            }
        });
    }

    private createGridModel() {
        return new GridModel({
            enableExport: false,
            selModel: 'single',
            contextMenu: [this.shutdownAction, '-', ...GridModel.defaultContextMenu],
            store: {
                idSpec: 'name',
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'isMaster', type: 'bool'},
                    {name: 'isLocal', type: 'bool'},
                    {name: 'wsConnections', type: 'int'},
                    {name: 'startupTime', type: 'date'},
                    {name: 'address', type: 'string'}
                ]
            },
            sortBy: ['isMaster', 'name'],
            columns: [
                {
                    field: 'name',
                    rendererIsComplex: true,
                    renderer: (v, {record}) => {
                        return this.formatInstance(record.data);
                    }
                },
                {
                    field: 'wsConnections',
                    headerName: 'Web Sockets',
                    ...numberCol
                },
                {
                    ...MCol.usedHeapMb,
                    headerName: 'Heap (MB)'
                },
                {
                    ...MCol.usedPctMax,
                    headerName: 'Heap (% Max)'
                },
                {
                    field: 'address'
                },
                {
                    field: 'startupTime',
                    ...adminDateTimeSec
                },
                {
                    colId: 'uptime',
                    field: 'startupTime',
                    renderer: v => getRelativeTimestamp(v, {pastSuffix: ''}),
                    rendererIsComplex: true
                }
            ],
            autosizeOptions: {mode: 'managed'}
        });
    }

    createTabModel() {
        return new TabContainerModel({
            route: 'default.servers',
            switcher: false,
            tabs: [
                {id: 'logViewer', title: 'Logs', icon: Icon.fileText(), content: logViewer},
                {id: 'memory', icon: Icon.chartLine(), content: memoryMonitorPanel},
                {id: 'connectionPool', icon: Icon.database(), content: connPoolMonitorPanel},
                {id: 'environment', icon: Icon.globe(), content: serverEnvPanel},
                {id: 'services', icon: Icon.gears(), content: servicePanel},
                {id: 'objects', icon: Icon.grip(), content: hzObjectPanel},
                {id: 'hibernate', icon: Icon.memory(), content: hibernatePanel},
                {id: 'webSockets', icon: Icon.bolt(), content: webSocketPanel}
            ]
        });
    }

    formatInstance(instance: PlainObject): ReactNode {
        const content = [instance.name];
        if (instance.isMaster) content.push(badge('master'));
        if (instance.isLocal) content.push(badge('local'));
        return hbox(content);
    }

    async shutdownInstanceAsync(instance: PlainObject) {
        if (
            !(await XH.confirm({
                message: `Are you SURE you want to shutdown instance '${instance.name}'? `,
                title: 'Shutdown Instance?',
                confirmProps: {
                    icon: Icon.skull(),
                    text: 'Shutdown Now',
                    intent: 'danger'
                },
                cancelProps: {
                    autoFocus: true
                }
            }))
        )
            return;

        await XH.fetchJson({
            url: 'clusterAdmin/shutdownInstance',
            params: {instance: instance.name}
        })
            .finally(() => this.loadAsync())
            .linkTo({observer: this.loadModel, message: 'Attempting instance shutdown'})
            .catchDefault();
    }
}
