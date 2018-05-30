/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {ToastManager} from '@xh/hoist/toast';
import {UrlStore} from '@xh/hoist/data';
import {GridModel, GridStateModel} from '@xh/hoist/cmp/grid';
import {baseCol} from '@xh/hoist/columns/Core';

@HoistModel()
export class ServiceModel {

    gridModel = new GridModel({
        stateModel: new GridStateModel({xhStateId: 'prefPanel', trackColumns: true}),
        store: new UrlStore({
            url: 'serviceAdmin/listServices',
            processRawData: this.processRawData,
            fields: ['provider', 'name']
        }),
        selModel: 'multiple',
        sortBy: 'name',
        groupBy: 'provider',
        columns: [
            baseCol({
                field: 'provider',
                fixedWidth: 100
            }),
            baseCol({field: 'name', minWidth: 300, flex: 1})
        ]
    });

    clearCaches() {
        const {selection} = this.gridModel;
        if (selection.length) return;

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
        ToastManager.show({message: 'Caches Cleared'});
    }

    async loadAsync() {
        return this.gridModel.loadAsync();
    }

    processRawData(rows) {
        rows.forEach(r => {
            r.provider = r.name && r.name.indexOf('hoist') === 0 ? 'Hoist' : 'App';
        });
        return rows;
    }

    destroy() {
        XH.destroy(this.gridModel);
    }
}
