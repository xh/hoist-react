/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {UrlStore} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/desktop/cmp/grid';
import {lowerFirst} from 'lodash';

@HoistModel
export class ServiceModel {

    gridModel = new GridModel({
        enableExport: true,
        store: new UrlStore({
            url: 'serviceAdmin/listServices',
            processRawData: this.processRawData,
            fields: ['provider', 'name', 'displayName']
        }),
        selModel: 'multiple',
        sortBy: 'displayName',
        groupBy: 'provider',
        columns: [
            {field: 'provider', width: 100},
            {field: 'displayName', minWidth: 300, flex: true}
        ]
    });

    clearCaches() {
        const {selection} = this.gridModel;
        if (!selection.length) return;

        const names = selection.map(it => it.name);
        XH.fetchJson({
            url: 'serviceAdmin/clearCaches',
            params: {names}
        }).then(
            this.onClearCacheSuccess()
        ).catchDefault();
    }

    onClearCacheSuccess = () => {
        this.loadAsync();
        XH.toast({message: 'Caches Cleared'});
    }

    async loadAsync() {
        return this.gridModel.loadAsync();
    }

    processRawData(r) {
        r.provider = r.name && r.name.startsWith('hoistCore') ? 'Hoist' : 'App';
        r.displayName = lowerFirst(r.name.replace('hoistCore', ''));
    }

    destroy() {
        XH.safeDestroy(this.gridModel);
    }
}
