/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {action, observable} from '@xh/hoist/mobx';
import {cloneDeep, isEqual, remove, trimEnd} from 'lodash';
import {pluralize} from '@xh/hoist/utils/js';
import {XH, HoistModel, managed} from '@xh/hoist/core';
import {LocalStore} from '@xh/hoist/data';
import {p} from '@xh/hoist/cmp/layout';
import {GridModel} from '@xh/hoist/cmp/grid';
import {StoreContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {Icon} from '@xh/hoist/icon';
import {actionCol} from '@xh/hoist/desktop/cmp/grid';

import {ConfigDifferDetailModel} from './ConfigDifferDetailModel';

/**
 * @private
 */
@HoistModel
export class ConfigDifferModel  {

    configModel;

    @managed
    detailModel = new ConfigDifferDetailModel({parent: this});

    @managed
    gridModel;

    @observable isOpen = false;
    @observable remoteHost = null;

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

    constructor(configModel) {
        this.configModel = configModel;

        this.gridModel = new GridModel({
            enableExport: true,
            store: new LocalStore({
                fields: [
                    'name', 'status', 'localValue', 'remoteValue'
                ],
                idSpec: 'name',
                name: 'differ',
                filter: (it) => it.status !== 'Identical'
            }),
            selModel: 'multiple',
            columns: [
                {field: 'name', width: 200},
                {
                    field: 'type',
                    width: 80,
                    renderer: this.configValueTypeRenderer
                },
                {
                    field: 'localValue',
                    flex: true,
                    renderer: this.valueRenderer
                },
                {
                    field: 'remoteValue',
                    flex: true,
                    renderer: this.valueRenderer,
                    agOptions: {
                        cellClassRules: {
                            'xh-green': this.setRemoteCellClass
                        }
                    }
                },
                {
                    field: 'status',
                    width: 120
                },
                {
                    ...actionCol,
                    width: 60,
                    actions: [this.applyRemoteAction]
                }
            ],
            contextMenuFn: this.contextMenuFn
        });
    }

    contextMenuFn = () => {
        return new StoreContextMenu({
            items: [this.applyRemoteAction]
        });
    }

    async doLoadAsync(loadSpec) {
        if (loadSpec.isAutoRefresh) return;

        const remoteHost = trimEnd(this.remoteHost, '/'),
            apiAffix = XH.baseUrl[0] == '/' ? XH.baseUrl : '/',
            remoteBaseUrl = remoteHost + apiAffix;

        try {
            const resp = await Promise.all([
                XH.fetchJson({url: XH.baseUrl + 'configDiffAdmin/configs', loadSpec}),
                XH.fetchJson({url: remoteBaseUrl + 'configDiffAdmin/configs', loadSpec})
            ]).linkTo(XH.appLoadModel);
            this.processResponse(resp);
        } catch (e) {
            this.processFailedLoad();
            if (e.httpStatus == 401) {
                XH.alert({
                    title: 'Access Denied',
                    icon: Icon.accessDenied(),
                    message: 'Access denied when querying configs. Are you logged in to an account with admin rights on the remote instance?'
                });
            } else {
                XH.handleException(e, {showAsError: false, logOnServer: false});
            }
        }
    }

    processResponse(resp) {
        const local = this.removeMetaData(resp[0].data),
            remote = this.removeMetaData(resp[1].data),
            diffedConfigs = this.diffConfigs(local, remote),
            {store} = this.gridModel;

        store.loadData(diffedConfigs);

        if (store.count == 0) this.showNoDiffToast();
    }

    processFailedLoad() {
        this.gridModel.store.loadData([]);
    }

    diffConfigs(localConfigs, remoteConfigs) {
        const ret = [];

        // 0) Check each local config against (possible) remote counterpart. Cull remote config if found.
        localConfigs.forEach(local => {
            const remote = remoteConfigs.find(it => it.name == local.name);

            ret.push({
                name: local.name,
                localValue: local,
                remoteValue: remote,
                status: this.configsAreEqual(local, remote) ? 'Identical' : (remote ? 'Diff' : 'Local Only')
            });

            if (remote) {
                remove(remoteConfigs, {name: remote.name});
            }
        });

        // 1) Any remote configs left in array are remote only
        remoteConfigs.forEach(remote => {
            ret.push({
                name: remote.name,
                localValue: null,
                remoteValue: remote,
                status: 'Remote Only'
            });
        });

        return ret;
    }

    configsAreEqual(local, remote) {
        const l = cloneDeep(local),
            r = cloneDeep(remote);

        if (l && r && l.valueType == 'json' && r.valueType == 'json') {
            l.value = JSON.parse(l.value);
            r.value = JSON.parse(r.value);
        }

        return isEqual(l, r);
    }

    removeMetaData(data) {
        data.forEach(it => {
            delete it.lastUpdated;
            delete it.lastUpdatedBy;
            delete it.id;
        });

        return data;
    }

    confirmApplyRemote(records) {
        const filteredRecords = records.filter(it => !this.isPwd(it)),
            hadPwdConfig = records.length != filteredRecords.length,
            willDeleteConfig = filteredRecords.some(it => !it.remoteValue),
            confirmMsg = `Are you sure you want to apply remote values to ${pluralize('config', filteredRecords.length, true)}?`;

        const message = (
            <div>
                <p>{confirmMsg}</p>
                <p hidden={!hadPwdConfig}>Warning: No changes will be applied to password configs. These must be changed manually.</p>
                <p hidden={!willDeleteConfig}>Warning: Operation includes deletions.</p>
            </div>
        );

        XH.confirm({
            title: 'Please Confirm',
            icon: Icon.warning({size: 'lg'}),
            message,
            onConfirm: () => this.doApplyRemote(filteredRecords)
        });
    }

    isPwd(diff) {
        if (diff.localValue && diff.localValue.valueType == 'pwd') return true;
        if (diff.remoteValue && diff.remoteValue.valueType == 'pwd') return true;
        return false;
    }

    doApplyRemote(records) {
        XH.fetchJson({
            url: 'configDiffAdmin/applyRemoteValues',
            params: {records: JSON.stringify(records)}
        }).finally(() => {
            this.loadAsync();
            this.configModel.loadAsync();
            this.detailModel.close();
        }).linkTo(
            XH.appLoadModel
        ).catchDefault();
    }

    showNoDiffToast() {
        XH.toast({message: 'Good news! All configs match remote host.'});
    }

    setRemoteCellClass(rec) {
        const data = rec.data,
            local = data.localValue,
            remote = data.remoteValue;

        if (local && remote) {
            return local.value != remote.value;
        }

        return true;
    }

    valueRenderer(v) {
        if (v == null) return '';
        return v.valueType === 'pwd' ? '*****' : v.value;
    }

    configValueTypeRenderer(v, {record}) {
        const local = record.localValue,
            remote = record.remoteValue;

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
        this.gridModel.loadData([]);
        this.setRemoteHost(null);
    }
}
