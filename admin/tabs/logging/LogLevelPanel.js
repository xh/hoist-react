/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {restGrid, RestGridModel, RestStore} from 'hoist/rest';
import {baseCol} from 'hoist/columns/Core';

import {nameCol} from '../../columns/Columns';

@hoistComponent()
export class LogLevelPanel extends Component {

    store = new RestStore({
        url: 'rest/logLevelAdmin',
        fields: [{
            name: 'name',
            label: 'Log Name',
            required: true
        }, {
            name: 'level',
            label: 'Override',
            lookupName: 'levels'
        },  {
            name: 'defaultLevel',
            label: 'Initial',
            editable: false
        }, {
            name: 'effectiveLevel',
            label: 'Effective',
            editable: false
        }]
    });

    gridModel = new RestGridModel({
        store: this.store,
        unit: 'log level',
        filterFields: ['name'],
        columns: [
            nameCol({minWidth: 200, flex: 1}),
            baseCol({field: 'defaultLevel', headerName: 'Initial', fixedWidth: 90}),
            baseCol({field: 'level', headerName: 'Override', fixedWidth: 90}),
            baseCol({field: 'effectiveLevel', headerName: 'Effective', fixedWidth: 90})
        ],
        editors: [
            {field: 'name'},
            {field: 'level', type: 'lookupSelect'} // waiting on decision regarding log level lookups null handling to decide exactly how to handle this control.
        ]
    });
    
    render() {
        return restGrid({model: this.gridModel});
    }

    async loadAsync() {
        return this.store.loadAsync();
    }
}
