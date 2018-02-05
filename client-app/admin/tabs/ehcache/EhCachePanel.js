/*
* This file belongs to Hoist, an application development toolkit
* developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
*
* Copyright © 2018 Extremely Heavy Industries Inc.
*/
import {Component} from 'react';
import {grid, GridModel} from 'hoist/grid';
import {observer} from 'hoist/mobx';
import {baseCol} from 'hoist/columns';

import {nameCol} from '../../columns';

@observer
export class EhCachePanel extends Component {

    model = new GridModel({
        url: 'ehCacheAdmin/listCaches',
        columns: [
            nameCol(),
            baseCol({field: 'heapSize', text: 'Heap Size (MB)', width: 130}),
            baseCol({field: 'entries', text: 'Entries', width: 130}),
            baseCol({field: 'status', text: 'Status', flex: 0.25})
        ]
    });
    
    render() {
        return grid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}
