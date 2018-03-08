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
            lookupName: 'levels',
            required: true
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
        columns: [
            nameCol(),
            baseCol({field: 'defaultLevel', width: 80}),
            baseCol({field: 'level', width: 80}),
            baseCol({field: 'effectiveLevel', width: 80})
        ],
        editors: [
            {field: 'name'},
            {field: 'level'}
        ]
    });
    
    render() {
        return restGrid({model: this.gridModel});
    }

    async loadAsync() {
        return this.store.loadAsync();
    }
}
