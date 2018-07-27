/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {restGrid, RestGridModel, RestStore} from '@xh/hoist/desktop/cmp/rest';
import {baseCol} from '@xh/hoist/columns/Core';

import {nameCol} from '@xh/hoist/admin/columns/Columns';

@HoistComponent()
export class LogLevelPanel extends Component {

    localModel = new RestGridModel({
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
                    lookupName: 'levels',
                    lookupStrict: true
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
            nameCol({minWidth: 200, flex: 1}),
            baseCol({field: 'defaultLevel', headerName: 'Initial', fixedWidth: 110}),
            baseCol({field: 'level', headerName: 'Override', fixedWidth: 110}),
            baseCol({field: 'effectiveLevel', headerName: 'Effective', fixedWidth: 110})
        ],
        editors: [
            {field: 'name'},
            {field: 'level'}
        ]
    });
    
    render() {
        return restGrid({model: this.model});
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}
