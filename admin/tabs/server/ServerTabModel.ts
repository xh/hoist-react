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
import {GridModel} from '@xh/hoist/cmp/grid';
import {strong} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';

export class ServerTabModel extends HoistModel {
    @managed gridModel: GridModel = this.createGridModel();
    @managed tabModel: TabContainerModel = this.createTabModel();

    get instance(): string {
        const {gridModel} = this,
            {store} = gridModel,
            rec = store.count === 1 ? store.records[0] : gridModel.selectedRecord;
        return rec?.data.name;
    }

    override async doLoadAsync() {
        const {gridModel} = this;
        const data = await XH.fetchJson({
            url: 'clusterAdmin/listInstances'
        });

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
                    {name: 'isMaster', type: 'bool'}
                ]
            },
            sortBy: 'isMaster',
            hideHeaders: true,
            columns: [
                {
                    field: 'name',
                    flex: 1,
                    renderer: (v, {record}) => {
                        return record.data.isMaster ? strong(v + ' (master)') : v;
                    }
                }
            ],
            autosizeOptions: {mode: 'managed'}
        });
    }

    createTabModel() {
        return new TabContainerModel({
            route: 'default.server',
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
