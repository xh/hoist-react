/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {UrlStore} from '@xh/hoist/data';
import {LocalDate} from '@xh/hoist/utils/datetime';

export class CacheModel extends HoistModel {
    override persistWith = {localStorageKey: 'xhAdminHzCacheState'};

    @managed
    gridModel = new GridModel({
        persistWith: this.persistWith,
        colChooserModel: true,
        enableExport: true,
        exportOptions: {filename: `${XH.appCode}-eh-caches-${LocalDate.today()}`},
        store: new UrlStore({
            url: 'hzCacheAdmin/listCaches',
            fields: [
                {name: 'name', type: 'string'},
                {name: 'size', type: 'int'}
            ],
            idSpec: 'name'
        }),
        sortBy: 'name',
        columns: [
            {field: 'name', width: 360},
            {field: 'size', ...Col.number, width: 130}
        ]
    });

    async clearAllAsync() {
        try {
            await XH.fetchJson({url: 'hzCacheAdmin/clearAllCaches'});
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
