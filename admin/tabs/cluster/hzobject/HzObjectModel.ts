/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import {timestampNoYear} from '@xh/hoist/admin/columns';
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/BaseInstanceModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';

export class HzObjectModel extends BaseInstanceModel {
    clearAction: RecordActionSpec = {
        icon: Icon.reset(),
        text: 'Clear Objects',
        intent: 'danger',
        actionFn: () => this.clearAsync(),
        displayFn: ({selectedRecords}) => ({
            hidden: AppModel.readonly,
            disabled:
                isEmpty(selectedRecords) || selectedRecords.some(r => r.data.objectType == 'Topic')
        }),
        recordsRequired: true
    };

    @managed
    gridModel = new GridModel({
        selModel: 'multiple',
        enableExport: true,
        exportOptions: {filename: exportFilenameWithDate('distributed-objects'), columns: 'ALL'},
        sortBy: 'name',
        groupBy: 'objectType',
        store: {
            fields: [
                {name: 'name', type: 'string'},
                {name: 'objectType', type: 'string', displayName: 'Type'},
                {name: 'size', type: 'int'},
                {name: 'stats', type: 'json'}
            ],
            idSpec: 'name'
        },
        columns: [
            {field: 'objectType', hidden: true},
            {field: 'name', flex: 1},
            {field: 'size', displayName: 'Entry Count', ...Col.number, width: 130},
            {
                ...timestampNoYear,
                field: {name: 'lastUpdateTime', type: 'date'},
                displayName: 'Last Updated'
            }
        ],
        contextMenu: [this.clearAction, '-', ...GridModel.defaultContextMenu]
    });

    async clearAsync() {
        try {
            await XH.fetchJson({
                url: 'hzObjectAdmin/clearObjects',
                params: {
                    instance: this.instanceName,
                    names: this.gridModel.selectedIds
                }
            }).linkTo(this.loadModel);

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
                    instance: this.instanceName
                }
            });

            response.forEach(it => {
                it.lastUpdateTime = it.stats?.lastUpdateTime;
            });

            return this.gridModel.loadData(response);
        } catch (e) {
            this.handleLoadException(e, loadSpec);
        }
    }
}
