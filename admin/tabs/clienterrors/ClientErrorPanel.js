/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, hoistComponent} from 'hoist/core';
import {grid, GridModel} from 'hoist/grid';
import {UrlStore} from 'hoist/data';
import {vframe} from 'hoist/layout';
import {baseCol} from 'hoist/columns/Core';
import {dateTimeCol} from 'hoist/columns/DatesTimes';
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
            dateTimeCol({field: 'dateCreated'}),
            usernameCol(),
            baseCol({field: 'error', flex: 3}),
            baseCol({field: 'msg', text: 'Message', flex: 1}),
            baseCol({field: 'browser', width: 100}),
            baseCol({field: 'device', width: 100}),
            baseCol({field: 'appVersion', width: 100}),
            baseCol({field: 'appEnvironment',  width: 100})
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
