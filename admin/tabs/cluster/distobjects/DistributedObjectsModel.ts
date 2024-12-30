/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import {timestampNoYear} from '@xh/hoist/admin/columns';
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/BaseInstanceModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {br, fragment} from '@xh/hoist/cmp/layout';
import {LoadSpec, managed, PlainObject, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {first, isEmpty, last} from 'lodash';

export class DistributedObjectsModel extends BaseInstanceModel {
    @bindable groupBy: 'type' | 'owner' = 'owner';

    @managed detailPanelModel = new PanelModel({
        side: 'right',
        defaultSize: 450
    });

    clearAction: RecordActionSpec = {
        text: 'Clear Objects',
        icon: Icon.reset(),
        intent: 'warning',
        actionFn: () => this.clearAsync(),
        displayFn: ({selectedRecords}) => ({
            hidden: AppModel.readonly,
            disabled:
                isEmpty(selectedRecords) || selectedRecords.every(r => r.data.objectType == 'Topic')
        }),
        recordsRequired: true
    };

    @managed
    gridModel = new GridModel({
        selModel: 'multiple',
        enableExport: true,
        autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
        exportOptions: {filename: exportFilenameWithDate('distributed-objects'), columns: 'ALL'},
        sortBy: 'displayName',
        groupBy: this.groupBy,
        store: {
            fields: [
                {name: 'name', type: 'string'},
                {name: 'displayName', type: 'string'},
                {name: 'owner', type: 'string'},
                {name: 'type', type: 'string', displayName: 'Type'},
                {name: 'size', type: 'int'},
                {name: 'lastUpdateTime', type: 'date'},
                {name: 'lastAccessTime', type: 'date'}
            ],
            idSpec: 'name',
            processRawData: o => this.processRawData(o)
        },
        columns: [
            {field: 'displayName'},
            {field: 'owner'},
            {field: 'type'},
            {field: 'size', displayName: 'Entries', ...Col.number},
            {
                ...timestampNoYear,
                field: 'lastUpdateTime',
                displayName: 'Last Update'
            },
            {
                ...timestampNoYear,
                field: 'lastAccessTime',
                displayName: 'Last Access'
            }
        ],
        contextMenu: [this.clearAction, '-', ...GridModel.defaultContextMenu]
    });

    constructor() {
        super();
        makeObservable(this);
        this.addReaction({
            track: () => this.groupBy,
            run: v => this.gridModel.setGroupBy(v)
        });
    }

    async clearAsync() {
        const {gridModel} = this;
        if (
            gridModel.selectedRecords.some(
                it => it.data.type != 'Cache' && !it.data.name.startsWith('cache')
            ) &&
            !(await XH.confirm({
                message: fragment(
                    'Your selection contains objects that may not be caches and may not be designed to be cleared.',
                    br(),
                    br(),
                    `Please ensure you understand the impact of this operation on the running application before proceeding.`
                ),
                confirmProps: {
                    text: 'Clear Objects',
                    icon: Icon.reset(),
                    intent: 'warning',
                    outlined: true,
                    autoFocus: false
                }
            }))
        ) {
            return;
        }

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

    async clearHibernateCachesAsync() {
        const confirmed = await XH.confirm({
            message: fragment(
                'This will clear the second-level Hibernate caches for all domain objects, requiring the server to re-query the database for their latest state.',
                br(),
                br(),
                `This can resolve issues with data modifications made directly to the database not appearing in a running application, but should be used with care as it can have a temporary performance impact.`
            ),
            confirmProps: {
                text: 'Clear Hibernate Caches',
                icon: Icon.reset(),
                intent: 'warning',
                outlined: true,
                autoFocus: false
            }
        });
        if (!confirmed) return;

        try {
            await XH.fetchJson({
                url: 'hzObjectAdmin/clearHibernateCaches',
                params: {instance: this.instanceName}
            }).linkTo(this.loadModel);

            await this.refreshAsync();
            XH.successToast('Hibernate Caches Cleared.');
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

            return this.gridModel.loadData(response);
        } catch (e) {
            this.handleLoadException(e, loadSpec);
        }
    }

    //----------------------
    // Implementation
    //----------------------
    private processRawData(obj: PlainObject): PlainObject {
        const tail: string = last(obj.name.split('.')),
            className = first(tail.split('['));

        const owner = className.endsWith('Service')
            ? className
            : className.startsWith('xh')
              ? 'Hoist'
              : obj.type == 'Hibernate Cache'
                ? 'Hibernate'
                : 'Other';

        return {
            displayName: tail,
            owner: owner,
            ...obj
        };
    }
}
