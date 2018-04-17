/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {baseCol, boolCheckCol} from 'hoist/columns/Core';
import {restGrid, RestGridModel, RestStore} from 'hoist/rest';
import {nameFlexCol} from 'hoist/admin/columns/Columns';

@hoistComponent()
export class MonitorEditorPanel extends Component {

    store = new RestStore({
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
    });

    gridModel = new RestGridModel({
        store: this.store,
        unit: 'monitor',
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
        return restGrid({model: this.gridModel});
    }

    async loadAsync() {
        return this.store.loadAsync();
    }
}