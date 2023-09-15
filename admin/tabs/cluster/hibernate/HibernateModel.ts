/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/BaseInstanceModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {RecordActionSpec} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {AppModel} from '@xh/hoist/admin/AppModel';

export class HibernateModel extends BaseInstanceModel {
    override persistWith = {localStorageKey: 'xhAdminHibernateState'};

    clearAction: RecordActionSpec = {
        icon: Icon.reset(),
        text: 'Clear Caches',
        intent: 'danger',
        actionFn: () => this.clearAsync(),
        displayFn: () => ({hidden: AppModel.readonly}),
        recordsRequired: true
    };

    @managed
    gridModel = new GridModel({
        persistWith: this.persistWith,
        colChooserModel: true,
        enableExport: true,
        selModel: 'multiple',
        contextMenu: [this.clearAction, '-', ...GridModel.defaultContextMenu],
        exportOptions: {filename: `${XH.appCode}-hibernate-${LocalDate.today()}`},
        store: {
            fields: [
                {name: 'name', type: 'string'},
                {name: 'size', type: 'int'},
                {name: 'stats', type: 'json'}
            ],
            idSpec: 'name'
        },
        sortBy: 'name',
        columns: [{field: 'name'}, {field: 'size', ...Col.number, width: 130}]
    });

    async clearAsync() {
        try {
            await XH.fetchJson({
                url: 'hibernateAdmin/clearCaches',
                params: {
                    instance: this.instanceName,
                    names: this.gridModel.selectedIds
                }
            });
            await this.refreshAsync();
            XH.successToast('Objects cleared.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const response = await XH.fetchJson({
                url: 'hibernateAdmin/listCaches',
                params: {
                    instance: this.instanceName
                }
            });
            return this.gridModel.loadData(response);
        } catch (e) {
            this.handleLoadException(e, loadSpec);
        }
    }
}
