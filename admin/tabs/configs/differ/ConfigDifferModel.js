/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React from 'react';
import {observable, setter} from 'hoist/mobx';
import {castArray, isEqual, remove, trimEnd} from 'lodash';
import {Intent} from 'hoist/kit/blueprint';
import {pluralize} from 'hoist/utils/JsUtils';
import {SECONDS} from 'hoist/utils/DateTimeUtils';
import {LocalStore} from 'hoist/data';
import {GridContextMenu, GridModel} from 'hoist/grid';
import {MessageModel, ToastManager} from 'hoist/cmp';
import {baseCol} from 'hoist/columns/Core';
import {nameCol} from 'hoist/admin/columns/Columns';
import {p} from 'hoist/layout';
import {Icon} from 'hoist/icon';

import {ConfigDifferDetailModel} from './ConfigDifferDetailModel';

export class ConfigDifferModel  {

    messageModel = new MessageModel({title: 'Warning', icon: Icon.warning({size: 'lg'})});
    detailModel = new ConfigDifferDetailModel({parent: this});

    @setter @observable isOpen = false;
    @setter @observable remoteHost = null;

    store = new LocalStore({
        fields: [
            'name', 'status', 'localValue', 'remoteValue'
        ],
        name: 'differ',
        filter: (it) => it.status !== 'Identical'
    });

    constructor() {
        this.gridModel = new GridModel({
            store: this.store,
            columns: [
                nameCol({flex: 1}),
                baseCol({
                    field: 'status',
                    fixedWidth: 100
                })
            ],
            contextMenuFn: this.contextMenuFn
        });
    }

    contextMenuFn = () => {
        return new GridContextMenu([
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
                XH.fetchJson({
                    url: XH.baseUrl + 'configDiffAdmin/configs'
                }),
                XH.fetchJson({
                    url: trimEnd(this.remoteHost, '/') + '/configDiffAdmin/configs'
                })
            ]);
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
            store = this.store;

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
            this.detailModel.closeDetail();
        }).catchDefault();
    }

    showNoDiffToast() {
        ToastManager.getToaster().show({
            intent: 'success',
            message: 'Good news! All configs match remote host.',
            icon: Icon.check({style: {alignSelf: 'center', marginLeft: '5px'}}),
            timeout: 3 * SECONDS
        });
    }

    close() {
        this.setIsOpen(false);
        this.store.loadData([]);
        this.setRemoteHost(null);
    }
}
