/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {action, observable, setter} from '@xh/hoist/mobx';
import {cloneDeep, isEqual, remove, trimEnd} from 'lodash';
import {pluralize} from '@xh/hoist/utils/JsUtils';
import {XH, HoistModel} from '@xh/hoist/core';
import {LocalStore} from '@xh/hoist/data';
import {p} from '@xh/hoist/layout';
import {GridModel} from '@xh/hoist/desktop/cmp/grid';
import {StoreContextMenu} from '@xh/hoist/desktop/cmp/contextmenu';
import {ToastManager} from '@xh/hoist/toast';
import {baseCol} from '@xh/hoist/columns/Core';
import {nameCol} from '@xh/hoist/admin/columns/Columns';
import {Icon} from '@xh/hoist/icon';

import {ConfigDifferDetailModel} from './ConfigDifferDetailModel';

/**
 * @private
 */
@HoistModel()
export class ConfigDifferModel  {

    detailModel = new ConfigDifferDetailModel({parent: this});

    @observable isOpen = false;
    @setter @observable remoteHost = null;

    constructor(configGrid) {
        this.configGrid = configGrid;

        this.gridModel = new GridModel({
            store: new LocalStore({
                fields: [
                    'name', 'status', 'localValue', 'remoteValue'
                ],
                name: 'differ',
                filter: (it) => it.status !== 'Identical'
            }),
            emptyText: 'Please enter remote host for comparison',
            selModel: 'multiple',
            columns: [
                nameCol({fixedWidth: 200}),
                baseCol({
                    field: 'type',
                    fixedWidth: 80,
                    valueFormatter: this.configValueTypeFormatter
                }),
                baseCol({
                    field: 'localValue',
                    flex: 1,
                    valueFormatter: this.configValueFormatter
                }),
                baseCol({
                    field: 'remoteValue',
                    flex: 1,
                    valueFormatter: this.configValueFormatter,
                    cellClassRules: {
                        'xh-green': this.setRemoteCellClass
                    }
                }),
                baseCol({
                    field: 'status',
                    fixedWidth: 120
                })
            ],
            contextMenuFn: this.contextMenuFn
        });
    }

    contextMenuFn = () => {
        return new StoreContextMenu({
            items: [
                {
                    text: 'Apply Remote',
                    action: (item, recordClickedOn, selModel) => this.confirmApplyRemote(selModel.records),
                    recordsRequired: true
                }
            ]
        });
    }

    async loadAsync() {
        const remoteHost = trimEnd(this.remoteHost, '/'),
            apiAffix = XH.baseUrl[0] == '/' ? XH.baseUrl : '/',
            remoteBaseUrl = remoteHost + apiAffix;

        try {
            const resp = await Promise.all([
                XH.fetchJson({url: XH.baseUrl + 'configDiffAdmin/configs'}),
                XH.fetchJson({url: remoteBaseUrl + 'configDiffAdmin/configs'})
            ]).linkTo(XH.appLoadModel);
            this.processResponse(resp);
        } catch (e) {
            this.processFailedLoad();
            XH.handleException(e, {showAsError: false, logOnServer: false});
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
            title: 'Warning',
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
            this.configGrid.loadAsync();
            this.detailModel.close();
        }).linkTo(
            XH.appLoadModel
        ).catchDefault();
    }

    showNoDiffToast() {
        ToastManager.show({message: 'Good news! All configs match remote host.'});
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

    configValueFormatter = (rec) => {
        const config = rec.data[rec.colDef.field];
        return config ? this.maskIfPwd(config) : null;
    }

    maskIfPwd(config) {
        return config.valueType === 'pwd' ? '*****' : config.value;
    }

    configValueTypeFormatter(rec) {
        const data = rec.data,
            local = data.localValue,
            remote = data.remoteValue;

        if (local && remote) {
            return local.valueType == remote.valueType ? local.valueType : '??';
        }

        return local ? local.valueType : remote.valueType;
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

    destroy() {
        XH.safeDestroy(this.detailModel, this.gridModel);
    }
}
