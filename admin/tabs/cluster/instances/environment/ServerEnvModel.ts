/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/instances/BaseInstanceModel';
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {GridModel} from '@xh/hoist/cmp/grid';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {forOwn} from 'lodash';

/**
 * Model/tab to list server-side environment variables and JVM system properties, as loaded from
 * a dedicated admin-only endpoint.
 */
export class ServerEnvModel extends BaseInstanceModel {
    @managed gridModel: GridModel;

    constructor() {
        super();

        this.gridModel = new GridModel({
            groupBy: 'type',
            sortBy: 'name',
            enableExport: true,
            exportOptions: {filename: exportFilenameWithDate('env')},
            store: {idSpec: data => `${data.type}-${data.name}`},
            columns: [
                {
                    field: {name: 'type', type: 'string'},
                    hidden: true
                },
                {
                    field: {name: 'name', type: 'string'},
                    width: 300,
                    cellClass: 'xh-font-family-mono'
                },
                {
                    field: {name: 'value', type: 'string'},
                    flex: 1,
                    cellClass: 'xh-font-family-mono',
                    autoHeight: true
                }
            ]
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const resp = await XH.fetchJson({
                    url: 'envAdmin',
                    params: {instance: this.instanceName}
                }),
                data = [];

            forOwn(resp.environment, (value, name) => {
                data.push({type: 'Environment Variables', value, name});
            });

            forOwn(resp.properties, (value, name) => {
                data.push({type: 'System Properties', value, name});
            });

            this.gridModel.loadData(data);
        } catch (e) {
            this.handleLoadException(e, loadSpec);
        }
    }
}
