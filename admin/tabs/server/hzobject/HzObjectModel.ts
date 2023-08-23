/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {HoistModel, LoadSpec, lookup, managed, XH} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {ServerTabModel} from '@xh/hoist/admin/tabs/server/ServerTabModel';
import {Icon} from '@xh/hoist/icon';
import {RecordActionSpec} from '@xh/hoist/data';
import {AppModel} from '@xh/hoist/admin/AppModel';

export class HzObjectModel extends HoistModel {
    override persistWith = {localStorageKey: 'xhAdminHzObjectState'};

    @lookup(() => ServerTabModel) parent: ServerTabModel;

    clearAction: RecordActionSpec = {
        icon: Icon.reset(),
        text: 'Clear Objects',
        intent: 'danger',
        actionFn: () => this.clearAsync(),
        displayFn: () => ({
            hidden: AppModel.readonly,
            disabled: this.gridModel.selectedRecords.some(r => r.data.objectType == 'Topic'),
        }),
        recordsRequired: true
    };

    @managed
    gridModel = new GridModel({
        persistWith: this.persistWith,
        selModel: 'multiple',
        colChooserModel: true,
        enableExport: true,
        exportOptions: {filename: `${XH.appCode}-hz-objects-${LocalDate.today()}`},
        contextMenu: [this.clearAction, '-', ...GridModel.defaultContextMenu],
        store: {
            fields: [
                {name: 'name', type: 'string'},
                {name: 'objectType', type: 'string', displayName: 'Type'},
                {name: 'size', type: 'int'},
                {name: 'stats', type: 'json'}
            ],
            idSpec: 'name'
        },
        sortBy: 'name',
        columns: [
            {field: 'name'},
            {field: 'objectType'},
            {field: 'size', ...Col.number, width: 130}
        ]
    });

    async clearAsync() {
        try {
            await XH.fetchJson({
                url: 'hzObjectAdmin/clearObjects',
                params: {
                    instance: this.parent.instanceName,
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
                url: 'hzObjectAdmin/listObjects',
                params: {
                    instance: this.parent.instanceName
                }
            });
            return this.gridModel.loadData(response);
        } catch (e) {
            XH.handleException(e);
        }
    }
}
