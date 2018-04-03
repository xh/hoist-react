/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, setter} from 'hoist/mobx';
import {castArray, isEqual, remove, trimEnd} from 'lodash';
import {pluralize} from 'hoist/utils/JsUtils';
import {LocalStore} from 'hoist/data';
import {GridModel} from 'hoist/grid';

import {baseCol} from 'hoist/columns/Core';
import {nameCol} from 'hoist/admin/columns/Columns';

import {MessageModel} from 'hoist/cmp';
import {p} from 'hoist/layout';
import {Icon} from 'hoist/icon';

import {GridContextMenu} from 'hoist/grid';
import {ConfigDifferDetailModel} from './ConfigDifferDetailModel';

export class ConfigDifferModel  {

    messageModel = new MessageModel({title: 'Warning', icon: Icon.warning({size: 'lg'})});

    @setter @observable isOpen = false;
    @setter remoteHost = null;
    @setter noRowsTemplate = 'Please enter remote host for comparison';

    store = new LocalStore({
        fields: [
            'name', 'status', 'localValue', 'remoteValue'
        ]
    });

    detailModel = new ConfigDifferDetailModel({parent: this});

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

        // this changes but not until you close and reopen the window
        // if made observable the grid rerenders with a incorrect size
        // but still(!) doesn't show the correct template
        this.setNoRowsTemplate('Good news! All configs match remote host.');
        store.loadDataAsync(diffedConfigs);

        store.setFilter((it) => {
            return it.status !== 'Identical';
        });
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
            // this.requestConfigs();
            // XH.getViewport().down('configPanel').refreshGrid();
            // loadMask here?
        }).catchDefault();
    }

    close() {
        this.setIsOpen(false);
        this.setNoRowsTemplate('Please enter remote host for comparison');
        this.store.loadDataAsync([]);
        this.setRemoteHost(null);
    }
}
