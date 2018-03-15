/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {UrlStore} from 'hoist/data';
import {GridModel} from 'hoist/grid';

import {baseCol} from 'hoist/columns/Core';
import {nameCol} from '../../columns/Columns';

export class EhCacheModel {

    store = new UrlStore({
        url: 'ehCacheAdmin/listCaches',
        fields: ['name', 'heapSize', 'entries', 'status']
    });

    gridModel = new GridModel({
        store: this.store,
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
        }).then(r => {
            return this.loadAsync();
        }).catchDefault();
    }

    async loadAsync() {
        return this.store.loadAsync();
    }
}
