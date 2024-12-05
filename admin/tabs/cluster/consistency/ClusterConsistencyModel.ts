/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/BaseInstanceModel';
import {GridModel, tagsRenderer} from '@xh/hoist/cmp/grid';
import {div} from '@xh/hoist/cmp/layout';
import {LoadSpec, managed, PlainObject, XH} from '@xh/hoist/core';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDateTimeSec, fmtJson, fmtNumber} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {isEmpty} from 'lodash';
import {observable} from 'mobx';

export class ClusterConsistencyModel extends BaseInstanceModel {
    @bindable groupBy: 'type' | 'owner' | 'inconsistencyState' = 'inconsistencyState';

    @managed detailPanelModel = new PanelModel({
        side: 'right',
        defaultSize: 450
    });

    @observable.ref now: Date;

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
                {name: 'type', type: 'string'},
                {name: 'owner', type: 'string'},
                {name: 'inconsistencyState', type: 'string'},
                {name: 'latestUpdated', type: 'auto'},
                {name: 'checks', type: 'auto'},
                {name: 'lastUpdated', type: 'auto'}
            ],
            processRawData: o => this.processRawData(o)
        },
        columns: [
            {
                field: 'inconsistencyState',
                width: 34,
                align: 'center',
                resizable: false,
                headerName: Icon.warning(),
                headerTooltip: 'Has Inconsistency',
                renderer: v =>
                    v === 'Has Inconsistency'
                        ? Icon.warning({prefix: 'fas', intent: 'danger'})
                        : null
            },
            {field: 'name'},
            {field: 'type'},
            {field: 'owner'},
            {
                field: 'latestUpdated',
                displayName: 'Last Update',
                rendererIsComplex: true,
                align: 'right',
                renderer: v =>
                    v
                        ? fmtNumber((this.now.getTime() - v) / 1000, {
                              precision: 3,
                              label: ' seconds ago'
                          })
                        : null,
                tooltip: v => fmtDateTimeSec(v)
            },
            {
                hidden: true,
                field: 'checks',
                renderer: v => (!isEmpty(v) ? tagsRenderer(Object.keys(v)) : null),
                tooltip: v => fmtJson(JSON.stringify(v))
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
                url: 'clusterConsistencyAdmin/listAllChecks'
            });

            this.now = new Date();

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
            ...obj,
            // Convert the bool into a string for ease of grouping.
            inconsistencyState: obj.hasInconsistency ? 'Has Inconsistency' : 'None',
            // Max lastUpdated date of all checks.
            latestUpdated: obj.lastUpdated
                ? Object.values(obj.lastUpdated).reduce(
                      (prev, next) => (next > prev ? next : prev),
                      0
                  )
                : null
        };
    }
}
