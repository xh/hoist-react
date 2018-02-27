/*
* This file belongs to Hoist, an application development toolkit
* developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
*
* Copyright © 2018 Extremely Heavy Industries Inc.
*/
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {grid, GridModel} from 'hoist/grid';
import {baseCol} from 'hoist/columns/Core';

import {nameCol} from '../../columns/Columns';

@hoistComponent()
export class EhCachePanel extends Component {

    gridModel = new GridModel({
        url: 'ehCacheAdmin/listCaches',
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
        return this.gridModel.loadAsync();
    }
}
