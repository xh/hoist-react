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
            dateTimeCol({field: 'dateCreated', minWidth: 120, maxWidth: 120}),
            usernameCol({minWidth: 120, maxWidth: 120}),
            baseCol({field: 'error', minWidth: 450}), // was sencha flex 3
            baseCol({field: 'msg', headerName: 'Message', minWidth: 150}), // was sencha flex 1
            baseCol({field: 'browser', width: 100}),
            baseCol({field: 'device', width: 80}),
            baseCol({field: 'appVersion', minWidth: 130, maxWidth: 130}),
            baseCol({field: 'appEnvironment',  minWidth: 140, maxWidth: 140})  // doing this a lot. Would be nice to have the col take a width and apply it as min and max
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
