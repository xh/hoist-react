/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {grid, GridModel} from 'hoist/grid';
import {UrlStore} from 'hoist/data';
import {vframe} from 'hoist/layout';
import {baseCol} from 'hoist/columns/Core';
import {compactDateCol} from 'hoist/columns/DatesTimes';
import {usernameCol} from '../../columns/Columns';

@hoistComponent()
export class ClientErrorPanel extends Component {

    store = new UrlStore({
        url: 'clientErrorAdmin',
        fields: [
            'username', 'error', 'msg', 'browser', 'device',
            'appVersion', 'appEnvironment', 'dateCreated'
        ]
    });

    gridModel = new GridModel({
        store: this.store,
        columns: [
            compactDateCol({field: 'dateCreated', fixedWidth: 100, align: 'right'}),
            usernameCol({fixedWidth: 120}),
            baseCol({field: 'error', minWidth: 450, width: 800}),
            baseCol({field: 'msg', headerName: 'Message', minWidth: 150, width: 270}),
            baseCol({field: 'browser', fixedWidth: 100}),
            baseCol({field: 'device', fixedWidth: 80}),
            baseCol({field: 'appVersion', fixedWidth: 130}),
            baseCol({field: 'appEnvironment', fixedWidth: 140})
        ]
    });

    render() {
        return vframe(
            grid({model: this.gridModel})
        );
    }

    async loadAsync() {
        return this.store.loadAsync();
    }
}
