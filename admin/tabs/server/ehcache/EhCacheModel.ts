/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {UrlStore} from '@xh/hoist/data';
import {trimEnd} from 'lodash';

export class EhCacheModel extends HoistModel {
    override persistWith = {localStorageKey: 'xhAdminEhCacheState'};

    @managed
    gridModel = new GridModel({
        persistWith: this.persistWith,
        colChooserModel: true,
        enableExport: true,
        exportOptions: {filename: exportFilenameWithDate('eh-caches')},
        store: new UrlStore({
            url: 'ehCacheAdmin/listCaches',
            fields: [
                {name: 'name', type: 'string'},
                {name: 'heapSize', type: 'int'},
                {name: 'entries', type: 'int'},
                {name: 'status', type: 'string'}
            ],
            idSpec: 'name',
            processRawData: row => {
                return {
                    ...row,
                    heapSize: parseFloat(trimEnd(row.heapSize, 'MB'))
                };
            }
        }),
        sortBy: 'name',
        columns: [
            {field: 'name', width: 360},
            {field: 'heapSize', ...Col.number, headerName: 'Heap Size (MB)', width: 130},
            {field: 'entries', ...Col.number, width: 120},
            {field: 'status', width: 120}
        ]
    });

    async clearAllAsync() {
        try {
            await XH.fetchJson({url: 'ehCacheAdmin/clearAllCaches'});
            await this.refreshAsync();
            XH.successToast('Hibernate caches cleared.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        return this.gridModel.loadAsync(loadSpec).catchDefault();
    }
}
