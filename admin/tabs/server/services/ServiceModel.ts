/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {UrlStore} from '@xh/hoist/data';
import {isEmpty, lowerFirst} from 'lodash';

export class ServiceModel extends HoistModel {
    @managed
    gridModel: GridModel = new GridModel({
        enableExport: true,
        exportOptions: {filename: exportFilenameWithDate('services')},
        hideHeaders: true,
        store: new UrlStore({
            url: 'serviceAdmin/listServices',
            idSpec: data => `${data.provider}-${data.name}`,
            processRawData: this.processRawData,
            fields: [
                {name: 'provider', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'displayName', type: 'string'}
            ]
        }),
        selModel: 'multiple',
        sortBy: 'displayName',
        groupBy: 'provider',
        columns: [
            {field: 'provider', hidden: true},
            {field: 'displayName', minWidth: 300, flex: true}
        ]
    });

    async clearCachesAsync() {
        const {selectedRecords} = this.gridModel;
        if (isEmpty(selectedRecords)) return;

        try {
            await XH.fetchJson({
                url: 'serviceAdmin/clearCaches',
                params: {names: selectedRecords.map(it => it.data.name)}
            });
            await this.refreshAsync();
            XH.successToast('Service caches cleared.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        return this.gridModel.loadAsync(loadSpec).catchDefault();
    }

    private processRawData(r) {
        const provider = r.name && r.name.startsWith('hoistCore') ? 'Hoist' : 'App';
        const displayName = lowerFirst(r.name.replace('hoistCore', ''));
        return {provider, displayName, ...r};
    }
}
