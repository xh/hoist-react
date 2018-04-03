/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, setter} from 'hoist/mobx';
import {isEqual, remove} from 'lodash';
import {LocalStore} from 'hoist/data';
import {GridModel} from 'hoist/grid';

import {button} from 'hoist/kit/blueprint';
import {baseCol} from 'hoist/columns/Core';
import {nameCol} from 'hoist/admin/columns/Columns';

import {toolbarSep} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

import {ConfigDifferDetailModel} from './ConfigDifferDetailModel';

export class ConfigDifferModel  {

    @setter @observable isOpen = false;
    @setter remoteHost = null;

    store = new LocalStore({
        fields: [
            'name', 'status', 'localValue', 'remoteValue'
        ]
    });

    gridModel = new GridModel({
        store: this.store,
        columns: [
            nameCol({flex: 1}),
            baseCol({
                field: 'status',
                fixedWidth: 100
            })
        ]
    });

    detailModel = new ConfigDifferDetailModel({});

    async loadAsync() {
        Promise.all([
            XH.fetchJson({
                url: 'http://localhost:8080/configDiffAdmin/configs' // without the absolute path, currently defaulting to 3000 (at least in dev)
            }),
            XH.fetchJson({
                url: this.remoteHost + '/configDiffAdmin/configs'
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
            diffedConfigs = this.diffConfigs(local, remote);

        // this.setEmptyText('Good news! All configs match remote host.');
        this.store.loadDataAsync(diffedConfigs);
    }

    processFailedLoad() {
        // this.setEmptyText('Please enter remote host for comparison');
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

    addDifferButton(items) {
        items.splice(3, 0,
            toolbarSep(),
            button({
                icon: Icon.diff(),
                text: 'Compare w/ Remote',
                onClick: this.onDifferBtnClick
            })
        );
        return items;
    }

    // models are only supposed to have methods, but I need a handler for this special case of adding an item to a rest grid toolbar.
    onDifferBtnClick = () => {
        this.setIsOpen(true);
    }

}
