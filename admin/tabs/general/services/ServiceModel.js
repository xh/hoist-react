/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {UrlStore} from '@xh/hoist/data';
import {lowerFirst} from 'lodash';

export class ServiceModel extends HoistModel {

    @managed
    gridModel = new GridModel({
        enableExport: true,
        hideHeaders: true,
        store: new UrlStore({
            url: 'serviceAdmin/listServices',
            processRawData: this.processRawData,
            fields: ['provider', 'name', 'displayName'],
            idSpec: XH.genId
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
        const {selection} = this.gridModel;
        if (!selection.length) return;

        try {
            await XH.fetchJson({
                url: 'serviceAdmin/clearCaches',
                params: {names: selection.map(it => it.data.name)}
            });
            await this.refreshAsync();
            XH.successToast('Service caches cleared.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    async doLoadAsync(loadSpec) {
        return this.gridModel.loadAsync(loadSpec).catchDefault();
    }

    processRawData(r) {
        const provider = r.name && r.name.startsWith('hoistCore') ? 'Hoist' : 'App';
        const displayName = lowerFirst(r.name.replace('hoistCore', ''));
        return {provider, displayName, ...r};
    }
}
