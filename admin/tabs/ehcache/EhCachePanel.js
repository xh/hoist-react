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
import {baseCol} from 'hoist/columns/Core';

import {nameCol} from '../../columns/Columns';

@hoistComponent()
export class EhCachePanel extends Component {

    gridModel = new GridModel({
        store: new UrlStore({
            url: 'ehCacheAdmin/listCaches',
            fields: ['name', 'heapSize', 'entries', 'status']
        }),
        columns: [
            nameCol({minWidth: 360}),
            baseCol({field: 'heapSize', fixedWidth: 130, rightAlign: true}),
            baseCol({field: 'entries', fixedWidth: 130, rightAlign: true}),
            baseCol({field: 'status', minWidth: 120, rightAlign: true})
        ]
    });
    
    render() {
        return grid({model: this.gridModel});
    }

    async loadAsync() {
        return this.gridModel.store.loadAsync();
    }
}
