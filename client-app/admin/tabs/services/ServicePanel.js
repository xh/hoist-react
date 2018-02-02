/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {baseCol} from 'hoist/columns/Core';
import {grid, GridModel} from 'hoist/grid';
import {observer, observable} from 'hoist/mobx';

@observer
export class ServicePanel extends Component {

    @observable model = new GridModel({
        url: 'serviceAdmin/listServices',
        columns: [
            baseCol({headerName: 'Provider', field: 'provider', width: 150, maxWidth: 150}),
            baseCol({headerName: 'Name', field: 'name', width: 300, maxWidth: 300})
        ],
        processRawData: this.processRawData
    });

    render() {
        return grid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }

    processRawData(rows) {
        rows.forEach(r => {
            r.provider = r.name && r.name.indexOf('hoist') === 0 ? 'Hoist' : 'App';
        });
        return rows;
    }
}