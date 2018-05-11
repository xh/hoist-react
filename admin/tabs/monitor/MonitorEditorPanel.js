/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from 'hoist/core';
import {baseCol, boolCheckCol} from 'hoist/columns/Core';
import {restGrid, RestGridModel, RestStore} from 'hoist/rest';
import {nameFlexCol} from 'hoist/admin/columns/Columns';

@HoistComponent()
export class MonitorEditorPanel extends Component {

    localModel = new RestGridModel({
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
            boolCheckCol({field: 'active', fixedWidth: 70}),
            baseCol({field: 'code', fixedWidth: 150}),
            nameFlexCol(),
            baseCol({field: 'warnThreshold', fixedWidth: 130}),
            baseCol({field: 'failThreshold', fixedWidth: 130}),
            baseCol({field: 'metricUnit', fixedWidth: 100}),
            baseCol({field: 'notes', minWidth: 70, flex: 1}),
            baseCol({field: 'sortOrder', fixedWidth: 100})
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