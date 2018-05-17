/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from 'hoist/core';
import {ToastManager} from 'hoist/toast';
import {UrlStore} from 'hoist/data';
import {GridModel} from 'hoist/cmp/grid';
import {baseCol} from 'hoist/columns/Core';

import {nameCol} from '../../columns/Columns';

@HoistModel()
export class EhCacheModel {

    gridModel = new GridModel({
        store: new UrlStore({
            url: 'ehCacheAdmin/listCaches',
            fields: ['name', 'heapSize', 'entries', 'status']
        }),
        sortBy: 'name',
        columns: [
            nameCol({minWidth: 360, flex: 3}),
            baseCol({field: 'heapSize', headerName: 'Heap Size (MB)', fixedWidth: 120, align: 'right'}),
            baseCol({field: 'entries', fixedWidth: 120, align: 'right'}),
            baseCol({field: 'status', minWidth: 120, flex: 1, align: 'right'})
        ]
    });

    clearAll() {
        XH.fetchJson({
            url: 'ehCacheAdmin/clearAllCaches'
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

    destroy() {
        XH.safeDestroy(this.gridModel);
    }
}


