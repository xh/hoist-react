/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {timestampNoYear} from '@xh/hoist/admin/columns';
import {connPoolMonitorPanel} from '@xh/hoist/admin/tabs/cluster/connpool/ConnPoolMonitorPanel';
import {distributedObjectsPanel} from '@xh/hoist/admin/tabs/cluster/distobjects/DistributedObjectsPanel';
import {serverEnvPanel} from '@xh/hoist/admin/tabs/cluster/environment/ServerEnvPanel';
import {logViewer} from '@xh/hoist/admin/tabs/cluster/logs/LogViewer';
import {usedHeapMb, usedPctMax} from '@xh/hoist/admin/tabs/cluster/memory/MemoryMonitorModel';
import {memoryMonitorPanel} from '@xh/hoist/admin/tabs/cluster/memory/MemoryMonitorPanel';
import {servicePanel} from '@xh/hoist/admin/tabs/cluster/services/ServicePanel';
import {webSocketPanel} from '@xh/hoist/admin/tabs/cluster/websocket/WebSocketPanel';
import {badge} from '@xh/hoist/cmp/badge';
import {GridModel, numberCol} from '@xh/hoist/cmp/grid';
import {hbox} from '@xh/hoist/cmp/layout';
import {getRelativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {TabContainerModel, TabModel} from '@xh/hoist/cmp/tab';
import {HoistModel, LoadSpec, lookup, managed, PlainObject, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {ReactNode} from 'react';

export class ClusterTabModel extends HoistModel {
    override persistWith = {localStorageKey: 'xhAdminClusterTabState'};

    @lookup(TabModel) private tabModel: TabModel;

    @managed readonly gridModel: GridModel = this.createGridModel();
    @managed readonly tabContainerModel: TabContainerModel = this.createTabContainerModel();
    @managed readonly timer: Timer;

    shutdownAction: RecordActionSpec = {
        icon: Icon.skull(),
        text: 'Shutdown Instance',
        intent: 'danger',
        actionFn: ({record}) => this.shutdownInstanceAsync(record.data),
        displayFn: () => ({hidden: AppModel.readonly}),
        recordsRequired: 1
    };

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

        let data = await XH.fetchJson({
            url: 'clusterAdmin/allInstances',
            // Tighter default timeout for background auto-refresh, to ensure we report connectivity
            // issues promptly. This call should be quick, but still allow full default timeout for
            // a manual refresh.
            timeout: loadSpec.isAutoRefresh ? this.autoRefreshTimeout : undefined,
            loadSpec
        });

        data = data.map(row => ({
            ...row,
            isLocal: row.name == XH.environmentService.serverInstance,
            usedHeapMb: row.memory?.usedHeapMb,
            usedPctMax: row.memory?.usedPctMax
        }));
        gridModel.loadData(data);
        await gridModel.preSelectFirstAsync();
    }

    constructor() {
        super();
        makeObservable(this);

        this.timer = Timer.create({
            runFn: () => {
                if (this.tabModel?.isActive) this.autoRefreshAsync();
            },
            interval: this.autoRefreshInterval,
            delay: true
        });

        this.addReaction(
            {
                track: () => this.instanceName,
                run: instName => {
                    if (instName) this.tabContainerModel.refreshContextModel.refreshAsync();
                }
            },
            {
                track: () => XH.environmentService.serverInstance,
                run: this.refreshAsync
            }
        );
    }

    formatInstance(instance: PlainObject): ReactNode {
        const content = [instance.name];
        if (instance.isPrimary) content.push(badge({item: 'primary', intent: 'primary'}));
        if (instance.isLocal) content.push(badge('local'));
        return hbox(content);
    }

    //------------------
    // Implementation
    //------------------
    private createGridModel() {
        return new GridModel({
            store: {
                idSpec: 'name',
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'isLocal', type: 'bool'},
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

    private createTabContainerModel() {
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
                    content: distributedObjectsPanel
                },
                {id: 'webSockets', title: 'WebSockets', icon: Icon.bolt(), content: webSocketPanel}
            ]
        });
    }

    private async shutdownInstanceAsync(instance: PlainObject) {
        if (
            !(await XH.confirm({
                message: `Are you SURE you want to shutdown instance ${instance.name}?`,
                confirmProps: {
                    icon: Icon.skull(),
                    text: 'Shutdown Now',
                    intent: 'danger',
                    autoFocus: false
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

    private get autoRefreshInterval(): number {
        return XH.getConf('xhAdminAppConfig', {}).clusterTabAutoRefreshInterval ?? 4 * SECONDS;
    }

    private get autoRefreshTimeout(): number {
        return XH.getConf('xhAdminAppConfig', {}).clusterTabAutoRefreshTimeout ?? 2 * SECONDS;
    }
}
