/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from '@xh/hoist/core';
import {GridModel} from '@xh/hoist/desktop/cmp/grid';
import {UrlStore} from '@xh/hoist/data';
import {baseCol} from '@xh/hoist/columns/Core';

import {nameCol} from '@xh/hoist/admin/columns/Columns';

@HoistModel()
export class EhCacheModel {

    gridModel = new GridModel({
        stateModel: 'xhEhCacheGrid',
        enableColChooser: true,
        enableExport: true,
        store: new UrlStore({
            url: 'ehCacheAdmin/listCaches',
            fields: ['name', 'heapSize', 'entries', 'status']
        }),
        sortBy: 'name',
        columns: [
            nameCol({minWidth: 360, flex: 3}),
            baseCol({field: 'heapSize', headerName: 'Heap Size (MB)', fixedWidth: 130, align: 'right'}),
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
        XH.toast({message: 'Caches Cleared'});
    }

    async loadAsync() {
        return this.gridModel.loadAsync();
    }

    destroy() {
        XH.safeDestroy(this.gridModel);
    }
}


