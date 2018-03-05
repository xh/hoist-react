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

import {nameFlexCol} from '../../columns/Columns';

@hoistComponent()
export class MonitorEditorPanel extends Component {

    store = new RestStore({
        url: 'rest/monitorAdmin',
        fields: [{
            name: 'code',
            required: true
        },{
            name: 'name',
            required: true
        },{
            name: 'metricType',
            lookupName: 'metricTypes',
            lookupStrict: true,
            required: true
        }, {
            name: 'metricUnit'
        }, {
            name: 'warnThreshold',
            type: 'int'
        },{
            name: 'failThreshold',
            type: 'int',
        }, {
            name: 'params'
        },{
            name: 'notes'
        }, {
            name: 'active',
            type: 'bool',
            defaultValue: true,
            required: true
        }, {
            name: 'sortOrder',
            type: 'int'
        }, {
            name: 'lastUpdated',
            type: 'date',
            editable: false
        }, {
            name: 'lastUpdatedBy',
            editable: false
        }]
    });

    gridModel = new RestGridModel({
        store: this.store,
        columns: [
            boolCheckCol({field: 'active', width: 60}),
            baseCol({field: 'code', width: 150}),
            nameFlexCol(),
            baseCol({field: 'warnThreshold', width: 120}),
            baseCol({field: 'failThreshold', width: 120}),
            baseCol({field: 'metricUnit', width: 100}),
            baseCol({field: 'notes', flex: 1}),
            baseCol({field: 'sortOrder', width: 100})
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

    loadAsync() {
        return this.store.loadAsync();
    }
}