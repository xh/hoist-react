/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {timestampNoYear} from '@xh/hoist/admin/columns';
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/BaseInstanceModel';
import {GridModel, tagsRenderer} from '@xh/hoist/cmp/grid';
import {div} from '@xh/hoist/cmp/layout';
import {LoadSpec, managed, PlainObject, XH} from '@xh/hoist/core';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {fmtJson} from '@xh/hoist/format';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {isEmpty} from 'lodash';

export class ClusterConsistencyModel extends BaseInstanceModel {
    @bindable groupBy: 'type' | null = 'type';

    @managed detailPanelModel = new PanelModel({
        side: 'right',
        defaultSize: 450
    });

    @managed
    gridModel = new GridModel({
        selModel: 'multiple',
        enableExport: true,
        autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
        exportOptions: {filename: exportFilenameWithDate('consistency-check'), columns: 'ALL'},
        sortBy: 'displayName',
        groupBy: this.groupBy,
        store: {
            fields: [
                {name: 'name', type: 'string'},
                {name: 'type', type: 'string', displayName: 'Type'},
                {name: 'checks', type: 'auto', displayName: 'Checks'},
                {name: 'timestamp', type: 'date'}
            ],
            idSpec: 'name',
            processRawData: o => this.processRawData(o)
        },
        columns: [
            {field: 'name'},
            {field: 'type'},
            {
                field: 'checks',
                renderer: v => (!isEmpty(v) ? tagsRenderer(Object.keys(v)) : null),
                tooltip: v => fmtJson(JSON.stringify(v))
            },
            {
                ...timestampNoYear,
                field: 'timestamp',
                displayName: 'Last Update'
            }
        ],
        contextMenu: [...GridModel.defaultContextMenu]
    });

    constructor() {
        super();
        makeObservable(this);
        this.addReaction({
            track: () => this.groupBy,
            run: v => this.gridModel.setGroupBy(v)
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const response = await XH.fetchJson({
                url: 'clusterConsistencyAdmin/listChecks',
                params: {
                    instance: this.instanceName
                }
            });

            return this.gridModel.loadData(response);
        } catch (e) {
            this.handleLoadException(e, loadSpec);
        }
    }

    async runChecks() {
        try {
            const response = await XH.fetchJson({
                url: 'clusterConsistencyAdmin/runChecks'
            });
            return await XH.alert({
                title: 'Cluster Consistency Check',
                message: div({
                    style: {whiteSpace: 'pre-wrap'},
                    item: JSON.stringify(response, null, 2)
                })
            });
        } catch (e) {
            XH.handleException(e);
        }
    }

    //----------------------
    // Implementation
    //----------------------
    private processRawData(obj: PlainObject): PlainObject {
        return {
            ...obj
        };
    }
}
