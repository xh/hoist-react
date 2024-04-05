/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import {timestampNoYear} from '@xh/hoist/admin/columns';
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/BaseInstanceModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {isEmpty, lowerFirst} from 'lodash';

export class ServiceModel extends BaseInstanceModel {
    clearCachesAction: RecordActionSpec = {
        icon: Icon.reset(),
        text: 'Clear Caches',
        intent: 'danger',
        actionFn: () => this.clearCachesAsync(false),
        displayFn: () => ({
            hidden: AppModel.readonly,
            text: `Clear Caches (@ ${this.instanceName})`
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
        selModel: 'multiple',
        enableExport: true,
        exportOptions: {filename: exportFilenameWithDate('services')},
        store: {
            idSpec: 'name',
            processRawData: this.processRawData,
            fields: [
                {name: 'provider', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'displayName', type: 'string'},
                {name: 'initializedDate', type: 'date', displayName: 'Initialized'},
                {name: 'lastCachesCleared', type: 'date', displayName: 'Last Cleared'}
            ]
        },
        sortBy: 'displayName',
        groupBy: 'provider',
        columns: [
            {field: 'provider', hidden: true},
            {field: 'displayName', flex: 1},
            {...timestampNoYear, field: 'lastCachesCleared'},
            {...timestampNoYear, field: 'initializedDate'}
        ],
        contextMenu: [
            this.clearCachesAction,
            this.clearClusterCachesAction,
            '-',
            ...GridModel.defaultContextMenu
        ]
    });

    async clearCachesAsync(entireCluster: boolean) {
        const {selectedRecords} = this.gridModel;
        if (isEmpty(selectedRecords)) return;

        try {
            await XH.fetchJson({
                url: 'serviceManagerAdmin/clearCaches',
                params: {
                    instance: entireCluster ? null : this.instanceName,
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
                params: {instance: this.instanceName},
                loadSpec
            });
            return this.gridModel.loadData(data);
        } catch (e) {
            this.handleLoadException(e, loadSpec);
        }
    }

    private processRawData(r) {
        const provider = r.name && r.name.startsWith('hoistCore') ? 'Hoist' : 'App';
        const displayName = lowerFirst(r.name.replace('hoistCore', ''));
        return {provider, displayName, ...r};
    }
}
