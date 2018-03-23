/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Intent} from 'hoist/kit/blueprint';
import {SECONDS} from 'hoist/utils/DateTimeUtils';
import {ToastManager} from 'hoist/cmp';
import {UrlStore} from 'hoist/data';
import {GridModel, GridContextMenu} from 'hoist/grid';

import {baseCol} from 'hoist/columns/Core';

export class ServiceModel {

    store = new UrlStore({
        url: 'serviceAdmin/listServices',
        processRawData: this.processRawData,
        fields: ['provider', 'name']
    });

    gridModel = new GridModel({
        store: this.store,
        columns: [
            baseCol({
                field: 'provider',
                // rowGroup: true,
                // hide: true,
                
                fixedWidth: 100
            }),
            baseCol({field: 'name', minWidth: 300, flex: 1})
        ],
        contextMenuFn:   () => {
            return new GridContextMenu([
                {
                    text: 'Group by Provider',
                    action: () => this.gridModel.groupBy('provider')
                },
                {
                    text: 'Ungroup',
                    action: () => this.gridModel.ungroup()
                }
            ]);
        }
    });

    clearCaches() {
        const selection = this.gridModel.selection;
        if (selection.isEmpty) return;

        const names = selection.records.map(it => it.name);
        XH.fetchJson({
            url: 'serviceAdmin/clearCaches',
            params: {names}
        }).then(
            this.onClearCacheSuccess()
        ).catchDefault();
    }

    onClearCacheSuccess = () => {
        this.loadAsync();
        ToastManager.getToaster().show({
            intent: Intent.SUCCESS,
            message: 'Caches Cleared',
            icon: 'tick',
            timeout: 3 * SECONDS
        });
    }

    async loadAsync() {
        return this.store.loadAsync();
    }

    processRawData(rows) {
        rows.forEach(r => {
            r.provider = r.name && r.name.indexOf('hoist') === 0 ? 'Hoist' : 'App';
        });
        return rows;
    }
}
