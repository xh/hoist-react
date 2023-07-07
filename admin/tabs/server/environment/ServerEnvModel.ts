/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {forOwn} from 'lodash';

/**
 * Model/tab to list server-side environment variables and JVM system properties, as loaded from
 * a dedicated admin-only endpoint.
 */
export class ServerEnvModel extends HoistModel {
    @managed gridModel: GridModel;

    constructor() {
        super();

        this.gridModel = new GridModel({
            groupBy: 'type',
            sortBy: 'name',
            enableExport: true,
            store: {idSpec: XH.genId},
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
        const resp = await XH.fetchJson({url: 'envAdmin'}),
            data = [];

        forOwn(resp.environment, (value, name) => {
            data.push({type: 'Environment Variables', value, name});
        });

        forOwn(resp.properties, (value, name) => {
            data.push({type: 'System Properties', value, name});
        });

        this.gridModel.loadData(data);
    }
}
