/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {action, observable, setter} from 'hoist/mobx';
import {castArray, isEqual, remove, trimEnd} from 'lodash';
import {pluralize} from 'hoist/utils/JsUtils';
import {XH, HoistModel} from 'hoist/core';
import {LocalStore} from 'hoist/data';
import {GridModel} from 'hoist/cmp/grid';
import {MessageModel, ToastManager, StoreContextMenu} from 'hoist/cmp';
import {baseCol} from 'hoist/columns/Core';
import {nameCol} from 'hoist/admin/columns/Columns';
import {p} from 'hoist/layout';
import {Icon} from 'hoist/icon';

import {ConfigDifferDetailModel} from './ConfigDifferDetailModel';

@HoistModel()
export class ConfigDifferModel  {

    messageModel = new MessageModel({title: 'Warning', icon: Icon.warning({size: 'lg'})});
    detailModel = new ConfigDifferDetailModel({parent: this});

    @observable isOpen = false;
    @setter @observable remoteHost = null;

    constructor() {
        this.gridModel = new GridModel({
            store: new LocalStore({
                fields: [
                    'name', 'status', 'localValue', 'remoteValue'
                ],
                name: 'differ',
                filter: (it) => it.status !== 'Identical'
            }),
            emptyText: 'Please enter remote host for comparison',
            columns: [
                nameCol({flex: 1}),
                baseCol({
                    field: 'status',
                    fixedWidth: 120
                })
            ],
            contextMenuFn: this.contextMenuFn
        });
    }

    contextMenuFn = () => {
        return new StoreContextMenu([
            {
                text: 'Apply Remote',
                action: (item, record) => this.confirmApplyRemote(record),
                recordsRequired: true
            }
        ]);
    }

    async loadAsync() {
        try {
            const resp = await Promise.all([
                XH.fetchJson({url: XH.baseUrl + 'configDiffAdmin/configs'}),
                XH.fetchJson({url: trimEnd(this.remoteHost, '/') + '/configDiffAdmin/configs'})
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
        this.store.loadData([]);
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
                status: isEqual(local, remote) ? 'Identical' : (remote ? 'Diff' : 'Local Only')
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

    removeMetaData(data) {
        data.forEach(it => {
            delete it.lastUpdated;
            delete it.lastUpdatedBy;
            delete it.id;
        });

        return data;
    }

    confirmApplyRemote(records) {
        const data = castArray(records),
            filteredData = data.filter(it => !this.isPwd(it)),
            hadPwdConfig = data.length != filteredData.length,
            willDeleteConfig = filteredData.some(it => !it.remoteValue),
            confirmMsg = `Are you sure you want to apply remote values to ${pluralize('config', filteredData.length, true)}?`;

        const message = (
            <div>
                <p>{confirmMsg}</p>
                <p hidden={!hadPwdConfig}>Warning: No changes will be applied to password configs. These must be changed manually.</p>
                <p hidden={!willDeleteConfig}>Warning: Operation includes deletions.</p>
            </div>
        );

        this.messageModel.confirm({
            message,
            onConfirm: () => this.doApplyRemote(filteredData)
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
            this.detailModel.close();
        }).linkTo(
            XH.appLoadModel
        ).catchDefault();
    }

    showNoDiffToast() {
        ToastManager.show({message: 'Good news! All configs match remote host.'});
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
        XH.safeDestroy(this.messageModel, this.detailModel, this.gridModel);
    }
}
