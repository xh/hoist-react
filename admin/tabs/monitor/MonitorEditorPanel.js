/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {baseCol, boolCheckCol} from '@xh/hoist/columns';
import {nameFlexCol} from '@xh/hoist/admin/columns';
import {restGrid, RestGridModel, RestStore} from '@xh/hoist/desktop/cmp/rest';

@HoistComponent()
export class MonitorEditorPanel extends Component {

    localModel = new RestGridModel({
        stateModel: 'xhMonitorEditorGrid',
        enableColChooser: true,
        enableExport: true,
        store: new RestStore({
            url: 'rest/monitorAdmin',
            fields: [
                {
                    name: 'code',
                    required: true
                },
                {
                    name: 'name',
                    required: true
                },
                {
                    name: 'metricType',
                    lookupName: 'metricTypes',
                    lookupStrict: true,
                    required: true
                },
                {
                    name: 'metricUnit'
                },
                {
                    name: 'warnThreshold',
                    type: 'int'
                },
                {
                    name: 'failThreshold',
                    type: 'int'
                },
                {
                    name: 'params',
                    type: 'json'
                },
                {
                    name: 'notes'
                },
                {
                    name: 'active',
                    type: 'bool',
                    defaultValue: true,
                    required: true
                },
                {
                    name: 'sortOrder',
                    type: 'int'
                },
                {
                    name: 'lastUpdated',
                    type: 'date',
                    editable: false
                },
                {
                    name: 'lastUpdatedBy',
                    editable: false
                }
            ]
        }),
        unit: 'monitor',
        sortBy: 'sortOrder',
        filterFields: ['code', 'name'],
        columns: [
            boolCheckCol({field: 'active', width: 70}),
            baseCol({field: 'code', width: 150}),
            nameFlexCol(),
            baseCol({field: 'warnThreshold', headerName: 'Warn', width: 130, align: 'right'}),
            baseCol({field: 'failThreshold', headerName: 'Fail', width: 130, align: 'right'}),
            baseCol({field: 'metricUnit', headerName: 'Units', width: 100}),
            baseCol({field: 'notes', minWidth: 70, flex: true}),
            baseCol({field: 'sortOrder', headerName: 'Sort', width: 100})
        ],
        editors: [
            {field: 'code'},
            {field: 'name'},
            {field: 'metricType'},
            {field: 'warnThreshold'},
            {field: 'failThreshold'},
            {field: 'metricUnit'},
            {field: 'params'},
            {field: 'notes', type: 'textarea'},
            {field: 'active'},
            {field: 'sortOrder'},
            {field: 'lastUpdated'},
            {field: 'lastUpdatedBy'}
        ]
    });

    render() {
        return restGrid({model: this.model});
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}