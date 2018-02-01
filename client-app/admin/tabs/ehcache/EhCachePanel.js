/*
* This file belongs to Hoist, an application development toolkit
* developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
*
* Copyright © 2018 Extremely Heavy Industries Inc.
*/
import {Component} from 'react';
import {grid, GridModel} from 'hoist/grid';
import {observer, observable} from 'hoist/mobx';

import {nameCol, heapSizeCol, entriesCol, statusCol} from '../../columns/Columns';

@observer
export class EhCachePanel extends Component {

    @observable model = new GridModel({
        url: 'ehCacheAdmin/listCaches',
        columns: [
            nameCol(),
            heapSizeCol(),
            entriesCol(),
            statusCol()
        ]
    });
    
    render() {
        return grid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}
