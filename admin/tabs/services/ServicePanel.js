/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {baseCol} from 'hoist/columns/Core';
import {grid, GridModel} from 'hoist/grid';
import {UrlStore} from 'hoist/data';
import {filler, vframe} from 'hoist/layout';
import {button} from 'hoist/kit/blueprint';
import {label, toolbar, toolbarSep} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

@hoistComponent()
export class ServicePanel extends Component {

    gridModel = new GridModel({
        store: new UrlStore({
            url: 'serviceAdmin/listServices',
            processRawData: this.processRawData,
            fields: ['provider', 'name']
        }),
        columns: [
            baseCol({field: 'provider', fixedWidth: 100}),
            baseCol({field: 'name', minWidth: 300, flex: 1})
        ]
    });

    render() {
        return vframe(
            this.renderToolbar(),
            grid({model: this.gridModel})
        );
    }

    renderToolbar() {
        return toolbar({
            items: [
                button({icon: Icon.sync(), text: 'Clear Caches', onClick: this.onClearCachesClick}), // disable this button if no selction
                toolbarSep(),
                button({icon: Icon.sync(), onClick: this.onRefreshClick}),
                filler(),
                this.renderServicesCount()
            ]
        });
    }

    onClearCachesClick = () => {
        const selection = this.gridModel.selection;
        if (selection.isEmpty) return;

        const names = selection.records.map(it => it.name);
        XH.fetchJson({
            url: 'serviceAdmin/clearCaches',
            params: {names}
        }).then(r => {
            return this.loadAsync();
        }).catchDefault();
    }

    onRefreshClick = () => {
        return this.loadAsync();
    }

    renderServicesCount() {
        const store = this.gridModel.store;
        return label(store.count + ' services');
    }

    async loadAsync() {
        return this.gridModel.store.loadAsync();
    }

    processRawData(rows) {
        rows.forEach(r => {
            r.provider = r.name && r.name.indexOf('hoist') === 0 ? 'Hoist' : 'App';
        });
        return rows;
    }
}