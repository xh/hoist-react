/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {timestampNoYear} from '@xh/hoist/admin/columns';
import {connPoolMonitorPanel} from '@xh/hoist/admin/tabs/cluster/connpool/ConnPoolMonitorPanel';
import {serverEnvPanel} from '@xh/hoist/admin/tabs/cluster/environment/ServerEnvPanel';
import {hzObjectPanel} from '@xh/hoist/admin/tabs/cluster/hzobject/HzObjectPanel';
import {logViewer} from '@xh/hoist/admin/tabs/cluster/logs/LogViewer';
import {usedHeapMb, usedPctMax} from '@xh/hoist/admin/tabs/cluster/memory/MemoryMonitorModel';
import {memoryMonitorPanel} from '@xh/hoist/admin/tabs/cluster/memory/MemoryMonitorPanel';
import {servicePanel} from '@xh/hoist/admin/tabs/cluster/services/ServicePanel';
import {webSocketPanel} from '@xh/hoist/admin/tabs/cluster/websocket/WebSocketPanel';
import {badge} from '@xh/hoist/cmp/badge';
import {GridModel, numberCol} from '@xh/hoist/cmp/grid';
import {hbox} from '@xh/hoist/cmp/layout';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, LoadSpec, managed, PlainObject, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {ReactNode} from 'react';

export class ClusterTabModel extends HoistModel {
    override persistWith = {localStorageKey: 'xhAdminClusterTabState'};

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

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {gridModel} = this;
        try {
            let data = await XH.fetchJson({url: 'clusterAdmin/allInstances', loadSpec});
            data = data.map(row => ({
                ...row,
                usedHeapMb: row.memory?.usedHeapMb,
                usedPctMax: row.memory?.usedPctMax
            }));

            gridModel.loadData(data);
            await gridModel.preSelectFirstAsync();
        } catch (e) {
            XH.handleException(e);
        }
    }

    constructor() {
        super();

        this.addReaction(
            {
                track: () => this.instanceName,
                run: instName => {
                    if (instName) this.tabModel.refreshContextModel.refreshAsync();
                }
            },
            {
                track: () => XH.environmentService.serverInstance,
                run: () => this.gridModel.agApi.refreshCells({columns: ['name'], force: true})
            }
        );
    }

    private createGridModel() {
        return new GridModel({
            store: {
                idSpec: 'name',
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'isPrimary', type: 'bool'},
                    {name: 'isReady', type: 'bool'},
                    {name: 'wsConnections', type: 'int'},
                    {name: 'startupTime', type: 'date'},
                    {name: 'address', type: 'string'}
                ]
            },
            columns: [
                {
                    field: 'isReady',
                    headerName: '',
                    align: 'center',
                    width: 40,
                    renderer: v =>
                        v
                            ? Icon.circle({prefix: 'fas', className: 'xh-green'})
                            : Icon.circle({prefix: 'fal', className: 'xh-white'}),
                    tooltip: v => (v ? 'Ready' : 'Not Ready')
                },
                {
                    field: 'name',
                    rendererIsComplex: true,
                    renderer: (v, {record}) => {
                        return this.formatInstance(record.data);
                    }
                },
                {
                    field: 'address'
                },
                {
                    ...usedHeapMb,
                    headerName: 'Heap (MB)'
                },
                {
                    ...usedPctMax,
                    headerName: 'Heap (% Max)'
                },
                {
                    field: 'wsConnections',
                    headerName: Icon.bolt(),
                    headerTooltip: 'Active Websocket Connections',
                    ...numberCol
                },
                {
                    ...timestampNoYear,
                    field: 'startupTime'
                },
                {
                    colId: 'uptime',
                    field: 'startupTime',
                    renderer: v => getRelativeTimestamp(v, {pastSuffix: ''}),
                    rendererIsComplex: true
                }
            ],
            contextMenu: [this.shutdownAction, '-', ...GridModel.defaultContextMenu]
        });
    }

    createTabModel() {
        return new TabContainerModel({
            route: 'default.cluster',
            switcher: false,
            tabs: [
                {id: 'logs', icon: Icon.fileText(), content: logViewer},
                {id: 'memory', icon: Icon.memory(), content: memoryMonitorPanel},
                {
                    id: 'jdbcPool',
                    title: 'JDBC Pool',
                    icon: Icon.database(),
                    content: connPoolMonitorPanel
                },
                {id: 'environment', icon: Icon.globe(), content: serverEnvPanel},
                {id: 'services', icon: Icon.gears(), content: servicePanel},
                {
                    id: 'objects',
                    title: 'Distributed Objects',
                    icon: Icon.grip(),
                    content: hzObjectPanel
                },
                {id: 'webSockets', title: 'WebSockets', icon: Icon.bolt(), content: webSocketPanel}
            ]
        });
    }

    formatInstance(instance: PlainObject): ReactNode {
        const content = [instance.name];
        if (instance.isPrimary) content.push(badge({item: 'primary', intent: 'primary'}));
        if (instance.name === XH.environmentService.serverInstance) content.push(badge('local'));
        return hbox(content);
    }

    async shutdownInstanceAsync(instance: PlainObject) {
        if (
            !(await XH.confirm({
                message: `Are you SURE you want to shutdown instance ${instance.name}?`,
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
