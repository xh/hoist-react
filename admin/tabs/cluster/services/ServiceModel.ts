/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import {timestampNoYear} from '@xh/hoist/admin/columns';
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/BaseInstanceModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import {br, fragment} from '@xh/hoist/cmp/layout';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {FilterLike, FilterTestFn, RecordActionSpec} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize, isEmpty, lowerFirst} from 'lodash';

export class ServiceModel extends BaseInstanceModel {
    @bindable
    typeFilter: 'hoist' | 'app' | 'all' = 'all';

    @bindable.ref
    textFilter: FilterTestFn = null;

    clearCachesAction: RecordActionSpec = {
        text: 'Clear Caches',
        icon: Icon.reset(),
        intent: 'warning',
        actionFn: () => this.clearCachesAsync(false),
        displayFn: () => ({
            hidden: AppModel.readonly,
            text: `Clear Caches (${this.instanceName})`
        }),
        recordsRequired: true
    };

    clearClusterCachesAction: RecordActionSpec = {
        text: 'Clear Caches (entire cluster)',
        icon: Icon.reset(),
        intent: 'warning',
        actionFn: () => this.clearCachesAsync(true),
        displayFn: () => ({
            hidden: AppModel.readonly || !this.parent.isMultiInstance
        }),
        recordsRequired: true
    };

    @managed
    gridModel: GridModel = new GridModel({
        selModel: 'multiple',
        enableExport: true,
        exportOptions: {filename: exportFilenameWithDate('services')},
        store: {
            idSpec: 'name',
            processRawData: this.processRawData,
            fields: [
                {name: 'provider', type: 'string'},
                {name: 'name', type: 'string'},
                {name: 'displayName', type: 'string'},
                {name: 'initializedDate', type: 'date', displayName: 'Initialized'},
                {name: 'lastCachesCleared', type: 'date', displayName: 'Last Cleared'}
            ]
        },
        sortBy: ['provider', 'displayName'],
        columns: [
            {field: 'provider'},
            {field: 'displayName', flex: 1},
            {...timestampNoYear, field: 'lastCachesCleared'},
            {...timestampNoYear, field: 'initializedDate'}
        ],
        contextMenu: [
            this.clearCachesAction,
            this.clearClusterCachesAction,
            '-',
            ...GridModel.defaultContextMenu
        ]
    });

    constructor() {
        super();
        makeObservable(this);
        this.addReaction({
            track: () => [this.textFilter, this.typeFilter],
            run: this.applyFilters,
            fireImmediately: true
        });
    }

    async clearCachesAsync(entireCluster: boolean) {
        const {gridModel, instanceName, loadModel} = this,
            {selectedRecords} = gridModel;
        if (isEmpty(selectedRecords)) return;

        const cacheStr =
            selectedRecords.length > 1
                ? pluralize('selected service cache', selectedRecords.length, true)
                : `${selectedRecords[0].data.displayName} cache`;

        const confirmed = await XH.confirm({
            message: fragment(
                `This will clear the ${cacheStr} ${entireCluster ? 'for all instances in this cluster' : 'for instance ' + instanceName}.`,
                br(),
                br(),
                `Please ensure you understand the impact of this operation on the running application before proceeding.`
            ),
            confirmProps: {
                text: 'Clear Caches',
                icon: Icon.reset(),
                intent: 'warning',
                outlined: true,
                autoFocus: false
            }
        });
        if (!confirmed) return;

        try {
            await XH.fetchJson({
                url: 'serviceManagerAdmin/clearCaches',
                params: {
                    instance: entireCluster ? null : instanceName,
                    names: selectedRecords.map(it => it.data.name)
                }
            }).linkTo(loadModel);
            await this.refreshAsync();
            XH.successToast('Service caches cleared.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const data = await XH.fetchJson({
                url: 'serviceManagerAdmin/listServices',
                params: {instance: this.instanceName},
                loadSpec
            });
            return this.gridModel.loadData(data);
        } catch (e) {
            this.handleLoadException(e, loadSpec);
        }
    }

    private processRawData(r) {
        const provider = r.name && r.name.startsWith('hoistCore') ? 'Hoist' : 'App';
        const displayName = lowerFirst(r.name.replace('hoistCore', ''));
        return {provider, displayName, ...r};
    }

    private applyFilters() {
        const {typeFilter, textFilter} = this;
        const filters: FilterLike[] = [textFilter];

        if (typeFilter == 'hoist' || typeFilter == 'app') {
            filters.push({field: 'provider', op: '=', value: capitalize(typeFilter)});
        }
        this.gridModel.store.setFilter(filters);
    }
}
