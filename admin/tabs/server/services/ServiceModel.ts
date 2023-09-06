/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {ServerTabModel} from '@xh/hoist/admin/tabs/server/ServerTabModel';
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {adminDateTimeSec} from '@xh/hoist/admin/tabs/server/Utils';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSpec, lookup, managed, XH} from '@xh/hoist/core';
import {isEmpty, lowerFirst} from 'lodash';
import {RecordActionSpec} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {AppModel} from '@xh/hoist/admin/AppModel';

export class ServiceModel extends HoistModel {
    @lookup(() => ServerTabModel) parent: ServerTabModel;

    clearCachesAction: RecordActionSpec = {
        icon: Icon.reset(),
        text: 'Clear Caches',
        intent: 'danger',
        actionFn: () => this.clearCachesAsync(false),
        displayFn: () => ({
            hidden: AppModel.readonly,
            text: `Clear Caches (@ ${this.parent.instanceName})`
        }),
        recordsRequired: true
    };

    clearClusterCachesAction: RecordActionSpec = {
        icon: Icon.reset(),
        text: 'Clear Caches (entire cluster)',
        intent: 'danger',
        actionFn: () => this.clearCachesAsync(true),
        displayFn: () => ({
            hidden: AppModel.readonly || !this.parent.isMultiInstance
        }),
        recordsRequired: true
    };

    @managed
    gridModel: GridModel = new GridModel({
        enableExport: true,
        exportOptions: {filename: exportFilenameWithDate('services')},
        contextMenu: [
            this.clearCachesAction,
            this.clearClusterCachesAction,
            '-',
            ...GridModel.defaultContextMenu
        ],
        store: {
            idSpec: 'name',
            processRawData: this.processRawData,
            fields: [
                {name: 'provider', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'displayName', type: 'string'},
                {name: 'initializedDate', type: 'date', displayName: 'Initialized'},
                {name: 'lastCachesCleared', type: 'date', displayName: 'Last Cleared'},
                {name: 'stats', type: 'json'}
            ]
        },
        selModel: 'multiple',
        sortBy: 'displayName',
        groupBy: 'provider',
        columns: [
            {field: 'provider', hidden: true},
            {field: 'displayName'},
            {field: 'lastCachesCleared', ...adminDateTimeSec},
            {field: 'initializedDate', ...adminDateTimeSec}
        ]
    });

    async clearCachesAsync(entireCluster: boolean) {
        const {selectedRecords} = this.gridModel;
        if (isEmpty(selectedRecords)) return;

        try {
            await XH.fetchJson({
                url: 'serviceManagerAdmin/clearCaches',
                params: {
                    instance: entireCluster ? null : this.parent.instanceName,
                    names: selectedRecords.map(it => it.data.name)
                }
            }).linkTo(this.loadModel);
            await this.refreshAsync();
            XH.successToast('Service caches cleared.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const data = await XH.fetchJson({
                url: 'serviceManagerAdmin/listServices',
                params: {instance: this.parent.instanceName},
                loadSpec
            });
            return this.gridModel.loadData(data);
        } catch (e) {
            XH.handleException(e);
        }
    }

    private processRawData(r) {
        const provider = r.name && r.name.startsWith('hoistCore') ? 'Hoist' : 'App';
        const displayName = lowerFirst(r.name.replace('hoistCore', ''));
        return {provider, displayName, ...r};
    }
}
