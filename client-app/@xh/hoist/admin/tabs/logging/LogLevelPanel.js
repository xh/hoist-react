/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {restGrid, RestGridModel} from 'hoist/rest';
import {baseCol} from 'hoist/columns/Core';

import {nameCol} from '../../columns/Columns';

@hoistComponent()
export class LogLevelPanel extends Component {

    gridModel = new RestGridModel({
        url: 'rest/logLevelAdmin',
        recordSpec: {
            fields: [
                {name: 'name', label: 'Log Name'},
                {name: 'defaultLevel', label: 'Initial'},
                {name: 'level', label: 'Override', lookup: 'levels'},
                {name: 'effectiveLevel', label: 'Effective'}
            ]
        },
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

    loadAsync() {
        return this.gridModel.loadAsync();
    }
}
