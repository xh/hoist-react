/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, setter} from 'hoist/mobx';
import {castArray, isEqual, remove, trimEnd} from 'lodash';
import {Intent} from 'hoist/kit/blueprint';
import {pluralize} from 'hoist/utils/JsUtils';
import {SECONDS} from 'hoist/utils/DateTimeUtils';
import {LocalStore} from 'hoist/data';
import {GridModel} from 'hoist/grid';
import {MessageModel, ToastManager} from 'hoist/cmp';
import {LastPromiseModel} from 'hoist/promise';
import {baseCol} from 'hoist/columns/Core';
import {nameCol} from 'hoist/admin/columns/Columns';
import {p} from 'hoist/layout';
import {Icon} from 'hoist/icon';

import {GridContextMenu} from 'hoist/grid';
import {ConfigDifferDetailModel} from './ConfigDifferDetailModel';

export class ConfigDifferModel  {

    messageModel = new MessageModel({title: 'Warning', icon: Icon.warning({size: 'lg'})});
    detailModel = new ConfigDifferDetailModel({parent: this});
    loadModel = new LastPromiseModel();

    @setter @observable isOpen = false;
    @setter @observable remoteHost = null;

    store = new LocalStore({
        fields: [
            'name', 'status', 'localValue', 'remoteValue'
        ]
    });

    // not sure why I can't do this declaratively
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
        Promise.all([
            XH.fetchJson({
                url: 'http://localhost:8080/configDiffAdmin/configs' // without the absolute path, currently defaulting to 3000 (at least in dev)
            }),
            XH.fetchJson({
                // avoid '//' in middle of url
                url: trimEnd(this.remoteHost, '/') + '/configDiffAdmin/configs'
            })
        ]).then(resp => {
            this.processResponse(resp);
        }).catch(e => {
            this.processFailedLoad();
            XH.handleException(e, {showAsError: false, logOnServer: false});
        });
    }

    processResponse(resp) {
        const local = this.removeMetaData(resp[0].data),
            remote = this.removeMetaData(resp[1].data),
            diffedConfigs = this.diffConfigs(local, remote),
            store = this.store;

        store.loadDataAsync(diffedConfigs);
        store.setFilter((it) => {
            return it.status !== 'Identical';
        });

        if (store.count == 0) this.showToast();
    }

    processFailedLoad() {
        this.setNoRowsTemplate('Please enter remote host for comparison');
        this.store.loadDataAsync([]);
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
                status: isEqual(local, remote) ? 'Identical' : remote ? 'Diff' : 'Local Only'
            });

            if (remote) {
                remove(remoteConfigs, it => remote.name == it.name);
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
        const data = castArray(records), // only single selections at the moment
            filteredData = data.filter(it => !this.isPwd(it)),
            hadPwdConfig = data.length != filteredData.length,
            willDeleteConfig = filteredData.some(it => !it.remoteValue),
            messages = [];

        messages.push(p(`Are you sure you want to apply remote values to ${pluralize('config', filteredData.length, true)}?`));
        if (hadPwdConfig) messages.push(p('Warning: No changes will be applied to password configs. These must be changed manually.'));
        if (willDeleteConfig) messages.push('Warning: Operation includes deletions.');

        this.messageModel.confirm({
            message: messages,
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
            this.detailModel.setRecord(null);
        }).catchDefault();
    }

    showToast() {
        ToastManager.getToaster().show({
            intent: Intent.SUCCESS,
            message: 'Good news! All configs match remote host.',
            icon: Icon.check({style: {alignSelf: 'center', marginLeft: '5px'}}),
            timeout: 3 * SECONDS
        });
    }

    close() {
        this.setIsOpen(false);
        this.store.loadDataAsync([]);
        this.setRemoteHost(null);
    }
}
