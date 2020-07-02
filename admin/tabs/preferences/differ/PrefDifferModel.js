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
import {cloneDeep, isEqual, remove, trimEnd} from 'lodash';
import React from 'react';
import {PrefDifferDetailModel} from './PrefDifferDetailModel';

/**
 * @private
 */
@HoistModel
@LoadSupport
export class PrefDifferModel  {

    prefModel;

    @managed
    detailModel = new PrefDifferDetailModel({parent: this});

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
        return XH.getConf('xhAppInstances').filter(it => it != window.location.origin);
    }

    constructor(prefModel) {
        this.prefModel = prefModel;
        this.gridModel = new GridModel({
            store: {
                idSpec: 'name',
                filter: (it) => it.data.status !== 'Identical'
            },
            emptyText: 'All prefs match!',
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
                {field: 'status', hidden: true},
                {field: 'name', width: 200},
                {
                    field: 'type',
                    width: 80,
                    renderer: this.prefValueTypeRenderer
                },
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
    }

    async doLoadAsync(loadSpec) {
        if (loadSpec.isAutoRefresh || !this.remoteHost) return;

        const remoteHost = trimEnd(this.remoteHost, '/'),
            // Assume default /api/ baseUrl during local dev, since actual baseUrl will be localhost:8080
            apiAffix = XH.isDevelopmentMode ? '/api/' : XH.baseUrl,
            remoteBaseUrl = remoteHost + apiAffix;

        try {
            const resp = await Promise.all([
                XH.fetchJson({url: XH.baseUrl + 'preferenceDiffAdmin/prefs', loadSpec}),
                XH.fetchJson({url: remoteBaseUrl + 'preferenceDiffAdmin/prefs', loadSpec})
            ]);
            this.processResponse(resp);
        } catch (e) {
            this.processFailedLoad();
            if (e.httpStatus == 401) {
                XH.alert({
                    title: 'Access Denied',
                    icon: Icon.accessDenied(),
                    message: 'Access denied when querying prefs. Are you logged in to an account with admin rights on the remote instance?'
                });
            } else {
                XH.handleException(e, {showAsError: false, logOnServer: false});
            }
        }
    }

    processResponse(resp) {
        const local = this.cleanRawData(resp[0].data),
            remote = this.cleanRawData(resp[1].data),
            diffedPrefs = this.diffRawPrefs(local, remote),
            {store} = this.gridModel;

        store.loadData(diffedPrefs);
        this.setHasLoaded(true);
        if (store.empty) this.showNoDiffToast();
    }

    processFailedLoad() {
        this.gridModel.clear();
        this.setHasLoaded(false);
    }

    diffRawPrefs(localPrefs, remotePrefs) {
        const ret = [];

        // 0) Check each local pref against (possible) remote counterpart. Cull remote pref if found.
        localPrefs.forEach(local => {
            const remote = remotePrefs.find(it => it.name == local.name);

            ret.push({
                name: local.name,
                localValue: local,
                remoteValue: remote,
                status: this.rawPrefsAreEqual(local, remote) ? 'Identical' : (remote ? 'Diff' : 'Local Only')
            });

            if (remote) {
                remove(remotePrefs, {name: remote.name});
            }
        });

        // 1) Any remote prefs left in array are remote only
        remotePrefs.forEach(remote => {
            ret.push({
                name: remote.name,
                localValue: null,
                remoteValue: remote,
                status: 'Remote Only'
            });
        });

        return ret;
    }

    rawPrefsAreEqual(local, remote) {
        // For JSON prefs, parse JSON to do an accurate value compare,
        // cloning to avoid disturbing the source data.
        if (local?.valueType == 'json' && remote?.valueType == 'json') {
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
        const willDeletePref = records.some(it => !it.data.remoteValue),
            confirmMsg = `Are you sure you want to apply remote values to ${pluralize('pref', records.length, true)}?`;

        const message = (
            <div>
                <p>{confirmMsg}</p>
                <p hidden={!willDeletePref}>Warning: Operation includes deletions.</p>
            </div>
        );

        XH.confirm({
            title: 'Please Confirm',
            icon: Icon.warning({size: 'lg'}),
            message,
            onConfirm: () => this.doApplyRemote(records)
        });
    }

    doApplyRemote(records) {
        const recsForPost = records.map(rec => {
            const {name, remoteValue} = rec.data;
            return {name, remoteValue};
        });

        XH.fetchJson({
            url: 'preferenceDiffAdmin/applyRemoteValues',
            params: {records: JSON.stringify(recsForPost)}
        }).finally(() => {
            this.loadAsync();
            this.prefModel.loadAsync();
            this.detailModel.close();
        }).linkTo(
            this.pendingTaskModel
        ).catchDefault();
    }

    showNoDiffToast() {
        XH.toast({message: 'Good news - all prefs match remote host.'});
    }

    valueRenderer(v) {
        if (v == null) return '';
        return v.value;
    }

    prefValueTypeRenderer(v, {record}) {
        const local = record.data.localValue,
            remote = record.data.remoteValue;

        if (local && remote) {
            return local.valueType == remote.valueType ? local.valueType : '??';
        }

        return local ? local.valueType : remote.valueType;
    }

    @action
    setRemoteHost(remoteHost) {
        this.remoteHost = remoteHost;
    }

    @action
    open() {
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
        this.gridModel.clear();
        this.setRemoteHost(null);
    }
}
