/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {restGrid, RestGridModel, RestStore} from '@xh/hoist/desktop/cmp/rest';
import {emptyFlexCol} from '@xh/hoist/cmp/grid';

@HoistComponent
export class LogLevelPanel extends Component {
    
    model = new RestGridModel({
        stateModel: 'xhLogLevelGrid',
        enableColChooser: true,
        enableExport: true,
        store: new RestStore({
            url: 'rest/logLevelAdmin',
            fields: [
                {
                    name: 'name',
                    label: 'Log Name',
                    required: true
                },
                {
                    name: 'level',
                    label: 'Override',
                    lookupName: 'levels'
                },
                {
                    name: 'defaultLevel',
                    label: 'Initial',
                    editable: false
                },
                {
                    name: 'effectiveLevel',
                    label: 'Effective',
                    editable: false
                }
            ]
        }),
        unit: 'log level',
        filterFields: ['name'],
        columns: [
            {field: 'name', width: 400},
            {field: 'defaultLevel', headerName: 'Initial', width: 110},
            {field: 'level', headerName: 'Override', width: 110},
            {field: 'effectiveLevel', headerName: 'Effective', width: 110},
            {...emptyFlexCol}
        ],
        editors: [
            {field: 'name'},
            {field: 'level'}
        ]
    });
    
    render() {
        return restGrid({model: this.model});
    }
}
