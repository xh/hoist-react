/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {ServerTabModel} from '@xh/hoist/admin/tabs/server/ServerTabModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSpec, lookup, managed, XH} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {isEmpty, lowerFirst} from 'lodash';

export class ServiceModel extends HoistModel {
    @lookup(() => ServerTabModel) parent: ServerTabModel;

    @managed
    gridModel: GridModel = new GridModel({
        enableExport: true,
        exportOptions: {filename: `${XH.appCode}-services-${LocalDate.today()}`},
        hideHeaders: true,
        store: {
            idSpec: XH.genId,
            processRawData: this.processRawData,
            fields: [
                {name: 'provider', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'displayName', type: 'string'}
            ]
        },
        selModel: 'multiple',
        sortBy: 'displayName',
        groupBy: 'provider',
        columns: [
            {field: 'provider', hidden: true},
            {field: 'displayName', minWidth: 300, flex: true}
        ]
    });

    async clearCachesAsync() {
        const {selectedRecords} = this.gridModel,
            {instanceName} = this.parent;
        if (isEmpty(selectedRecords) || !instanceName) return;

        try {
            await XH.fetchJson({
                url: 'serviceManagerAdmin/clearCaches',
                params: {
                    instance: instanceName,
                    names: selectedRecords.map(it => it.data.name)
                }
            });
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
