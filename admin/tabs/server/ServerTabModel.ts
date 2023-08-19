/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {cachePanel} from '@xh/hoist/admin/tabs/server/cache/CachePanel';
import {connPoolMonitorPanel} from '@xh/hoist/admin/tabs/server/connectionpool/ConnPoolMonitorPanel';
import {serverEnvPanel} from '@xh/hoist/admin/tabs/server/environment/ServerEnvPanel';
import {logViewer} from '@xh/hoist/admin/tabs/server/logViewer/LogViewer';
import {memoryMonitorPanel} from '@xh/hoist/admin/tabs/server/memory/MemoryMonitorPanel';
import {servicePanel} from '@xh/hoist/admin/tabs/server/services/ServicePanel';
import {webSocketPanel} from '@xh/hoist/admin/tabs/server/websocket/WebSocketPanel';
import {GridModel, numberCol} from '@xh/hoist/cmp/grid';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import * as MCol from '../monitor/MonitorColumns';
import {badge} from '@xh/hoist/cmp/badge';
import {hbox} from '@xh/hoist/cmp/layout';

export class ServerTabModel extends HoistModel {
    @managed gridModel: GridModel = this.createGridModel();
    @managed tabModel: TabContainerModel = this.createTabModel();

    get instance(): string {
        return this.gridModel.selectedRecord?.data.name;
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
                    flex: 1,
                    renderer: (v, {record}) => {
                        const content = [v];
                        if (record.data.isMaster) content.push(badge('master'));
                        if (record.data.isLocal) content.push(badge('local'));
                        return hbox(content);
                    }
                },
                {
                    field: 'startupTime',
                    headerName: 'Uptime',
                    renderer: v => getRelativeTimestamp(v, {pastSuffix: ''})
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
                {id: 'logViewer', icon: Icon.fileText(), content: logViewer},
                {id: 'memory', icon: Icon.server(), content: memoryMonitorPanel},
                {
                    id: 'connectionPool',
                    icon: Icon.database(),
                    content: connPoolMonitorPanel
                },
                {id: 'environment', icon: Icon.globe(), content: serverEnvPanel},
                {id: 'services', icon: Icon.gears(), content: servicePanel},
                {
                    id: 'ehCache',
                    icon: Icon.memory(),
                    title: 'Caches',
                    content: cachePanel
                },
                {
                    id: 'webSockets',
                    title: 'WebSockets',
                    icon: Icon.bolt(),
                    content: webSocketPanel
                }
            ]
        });
    }
}
