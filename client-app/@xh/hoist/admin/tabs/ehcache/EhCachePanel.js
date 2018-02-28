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
            recordSpec: {fields: ['heapSize', 'entries', 'status']}
        }),
        columns: [
            nameCol(),
            baseCol({field: 'heapSize', text: 'Heap Size (MB)', width: 130}),
            baseCol({field: 'entries', text: 'Entries', width: 130}),
            baseCol({field: 'status', text: 'Status', flex: 0.25})
        ]
    });
    
    render() {
        return grid({model: this.gridModel});
    }

    loadAsync() {
        return this.gridModel.store.loadAsync();
    }
}
