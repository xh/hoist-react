/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {GridModel} from '@xh/hoist/cmp/grid';
import {p} from '@xh/hoist/cmp/layout';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {actionCol} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {cloneDeep, isEqual, isString, isNil, remove, trimEnd} from 'lodash';
import React from 'react';

import {DifferDetailModel} from './DifferDetailModel';

/**
 * @private
 */
@HoistModel
@LoadSupport
export class DifferModel  {

    parentGridModel;
    entityName;
    displayName;
    columnFields;
    matchFields;
    valueRenderer;
    url;
    clipboardContent;

    @managed
    detailModel = new DifferDetailModel({parent: this});

    @managed
    gridModel;

    @bindable remoteHost;
    @bindable hasLoaded = false;
    @observable isOpen = false;

    applyRemoteAction = {
        text: 'Apply Remote',
        icon: Icon.cloudDownload(),
        // Account for use in both action column (record only) and context menu (selectedRecords).
        actionFn: ({record, selectedRecords}) => {
            const selection = selectedRecords || [record];
            this.confirmApplyRemote(selection);
        },
        recordsRequired: true
    };

    get remoteHosts() {
        return XH.getConf('xhAppInstances').filter(it => it !== window.location.origin);
    }

    constructor({
        parentGridModel,
        entityName,
        displayName,
        columnFields = ['name'],
        matchFields = ['name'],
        valueRenderer
    }) {
        this.parentGridModel = parentGridModel;
        this.entityName = entityName;
        this.displayName = displayName ?? entityName;
        this.columnFields = columnFields;
        this.matchFields = matchFields;
        this.valueRenderer = valueRenderer ?? (v => isNil(v) ? '' : v.value);

        this.url = entityName + 'DiffAdmin';

        this.gridModel = new GridModel({
            store: {
                idSpec: 'name',
                filter: {field: 'status', op: '!=', value: 'Identical'},
                fields: [...this.columnFields.map(it => it.field ?? it)]
            },
            emptyText: 'All records match!',
            selModel: 'multiple',
            sortBy: 'name',
            groupBy: 'status',
            enableExport: true,
            showHover: true,
            columns: [
                {
                    ...actionCol,
                    width: 60,
                    actions: [this.applyRemoteAction]
                },
                {
                    field: 'status',
                    hidden: true
                },
                ...this.columnFields.map(it => {
                    const colDef = {renderer: this.fieldRenderer, maxWidth: 200};
                    return isString(it) ? {field: it, ...colDef} : {...colDef, ...it};
                }),
                {
                    field: 'localValue',
                    flex: true,
                    renderer: this.valueRenderer
                },
                {
                    field: 'remoteValue',
                    flex: true,
                    renderer: this.valueRenderer
                }
            ],
            contextMenu: [
                this.applyRemoteAction,
                '-',
                ...GridModel.defaultContextMenu
            ]
        });

        this.addReaction({
            when: () => this.hasLoaded && this.gridModel.isReady,
            run: () => this.gridModel.autosizeAsync()
        });
    }

    async doLoadAsync(loadSpec) {
        if (loadSpec.isAutoRefresh || (!this.remoteHost && !this.clipboardContent)) return;

        const remoteHost = trimEnd(this.remoteHost, '/'),
            // Assume default /api/ baseUrl during local dev, since actual baseUrl will be localhost:8080
            apiAffix = XH.isDevelopmentMode ? '/api/' : XH.baseUrl,
            remoteBaseUrl = remoteHost + apiAffix,
            {entityName, url} = this;

        try {
            const resp = await Promise.all([
                XH.fetchJson({url: `${url}/${entityName}s`, loadSpec}),
                this.clipboardContent ?
                    Promise.resolve(cloneDeep(this.clipboardContent)) :
                    XH.fetchJson({url: `${remoteBaseUrl}${url}/${entityName}s`, loadSpec})
            ]);
            this.processResponse(resp);
        } catch (e) {
            this.processFailedLoad();
            if (e.httpStatus === 401) {
                XH.alert({
                    title: 'Access Denied',
                    icon: Icon.accessDenied(),
                    message: 'Access denied when querying records. Are you logged in to an account with admin rights on the remote instance?'
                });
            } else {
                XH.handleException(e, {showAsError: false, logOnServer: false});
            }
        }
    }

    diffFromRemote() {
        this.clipboardContent = null;
        this.loadAsync();
    }

    async diffFromClipboardAsync() {
        try {
            await this.readConfigFromClipboardAsync();
            this.loadAsync();
        } catch (e) {
            XH.handleException(e, {showAsError: false, logOnServer: false});
        }
    }

    processResponse(resp) {
        const local = this.cleanRawData(resp[0].data),
            remote = this.cleanRawData(resp[1].data),
            diffedRecords = this.diffRawRecords(local, remote),
            {store} = this.gridModel;

        store.loadData(diffedRecords);
        this.setHasLoaded(true);
        if (store.empty) this.showNoDiffToast();
    }

    processFailedLoad() {
        this.gridModel.clear();
        this.clipboardContent = null;
        this.setHasLoaded(false);
    }

    diffRawRecords(localRecords, remoteRecords) {
        const ret = [];

        // 0) Check each local record against (possible) remote counterpart. Cull remote record if found.
        localRecords.forEach(local => {
            const remote = remoteRecords.find(it => {
                return this.matchFields.every(field => it[field] === local[field]);
            });

            const values = {};
            this.matchFields.forEach(field => {
                values[field] = local[field];
            });

            ret.push({
                ...values,
                localValue: local,
                remoteValue: remote,
                status: this.rawRecordsAreEqual(local, remote) ? 'Identical' : (remote ? 'Diff' : 'Local Only')
            });

            if (remote) {
                remove(remoteRecords, it => {
                    return this.matchFields.every(field => it[field] === remote[field]);
                });
            }
        });

        // 1) Any remote records left in array are remote only
        remoteRecords.forEach(remote => {
            const values = {};
            this.matchFields.forEach(field => {
                values[field] = remote[field];
            });

            ret.push({
                ...values,
                localValue: null,
                remoteValue: remote,
                status: 'Remote Only'
            });
        });

        return ret;
    }

    rawRecordsAreEqual(local, remote) {
        // For JSON records, parse JSON to do an accurate value compare,
        // cloning to avoid disturbing the source data.
        if (local?.valueType === 'json' && remote?.valueType === 'json') {
            local = cloneDeep(local);
            local.value = JSON.parse(local.value);
            remote = cloneDeep(remote);
            remote.value = JSON.parse(remote.value);
        }

        return isEqual(local, remote);
    }

    cleanRawData(data) {
        data.forEach(it => {
            delete it.lastUpdated;
            delete it.lastUpdatedBy;
            delete it.id;
        });

        return data;
    }

    confirmApplyRemote(records) {
        const filteredRecords = records.filter(it => !this.isPwd(it)),
            hadPwd = records.length !== filteredRecords.length,
            willDelete = filteredRecords.some(it => !it.data.remoteValue),
            confirmMsg = `Are you sure you want to apply remote values to ${pluralize(this.displayName, filteredRecords.length, true)}?`;

        const message = (
            <div>
                <p>{confirmMsg}</p>
                <p hidden={!hadPwd}>Warning: No changes will be applied to password records. These must be changed manually.</p>
                <p hidden={!willDelete}>Warning: Operation includes deletions.</p>
            </div>
        );

        XH.confirm({
            title: 'Please Confirm',
            icon: Icon.warning({size: 'lg'}),
            message,
            onConfirm: () => this.doApplyRemote(filteredRecords)
        });
    }

    isPwd(rec) {
        const {localValue, remoteValue} = rec.data;
        return localValue?.valueType === 'pwd' || remoteValue?.valueType === 'pwd';
    }

    doApplyRemote(records) {
        const recsForPost = records.map(rec => {
            const ret = {remoteValue: rec.data.remoteValue};
            this.matchFields.forEach(field => {
                ret[field] = rec.data[field];
            });
            return ret;
        });

        XH.fetchJson({
            url: `${this.url}/applyRemoteValues`,
            params: {records: JSON.stringify(recsForPost)}
        }).finally(() => {
            this.loadAsync();
            this.parentGridModel.loadAsync();
            this.detailModel.close();
        }).linkTo(
            this.pendingTaskModel
        ).catchDefault();
    }

    showNoDiffToast() {
        XH.toast({message: 'Good news - all records match remote host.'});
    }

    fieldRenderer(v, {record, column}) {
        const {field} = column,
            local = record.data.localValue,
            remote = record.data.remoteValue,
            localVal = local?.[field],
            remoteVal = remote?.[field];

        if (local && remote) {
            return localVal === remoteVal ? localVal : '??';
        }

        return local ? localVal : remoteVal;
    }

    async fetchLocalConfigsAsync() {
        const {entityName, url} = this,
            resp = await XH.fetchJson({url: `${url}/${entityName}s`});
        return JSON.stringify(resp);
    }

    async readConfigFromClipboardAsync() {
        // Try/catch locally to re-throw with consistent error message if clipboard cannot be read
        // or parsed into JSON w/expected format for any reason.
        let content = null;
        try {
            content = await window.navigator.clipboard.readText();
            content = JSON.parse(content);
        } catch (e) {
            console.warn('Error reading config from clipboard', e);
        }

        this.clipboardContent = content;
        if (!this.clipboardContent?.data) {
            throw XH.exception('Clipboard did not contain remote data in the expected JSON format.');
        }
    }

    @action
    open() {
        this.hasLoaded = false;
        this.remoteHost = null;
        this.isOpen = true;
    }

    @action
    close() {
        this.hasLoaded = false;
        this.remoteHost = null;
        this.isOpen = false;
    }
}
