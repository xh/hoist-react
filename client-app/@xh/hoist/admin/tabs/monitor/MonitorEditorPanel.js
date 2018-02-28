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
        recordSpec: {
            fields: [
                {name: 'code', label: 'Code'},
                {name: 'name', label: 'Name'},
                {name: 'metricType', label: 'Metric Type', lookup: 'metricTypes'},
                {name: 'metricUnit', label: 'Metric Unit', allowNull: true},
                {name: 'warnThreshold', label: 'Warn Threshold', type: 'int', allowNull: true},
                {name: 'failThreshold', label: 'Fail Threshold', type: 'int', allowNull: true},
                {name: 'params', label: 'Params'},
                {name: 'notes', label: 'Notes', allowNull: true},
                {name: 'active', label: 'Active', type: 'boolean'},
                {name: 'sortOrder', label: 'Sort', type: 'int', allowNull: true},
                {name: 'lastUpdated', label: 'Last Updated', type: 'date', readOnly: true, allowNull: true},
                {name: 'lastUpdatedBy', label: 'Last Updated By', readOnly: true, allowNull: true}
            ]
        }
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
            {field: 'params', type: 'textarea'},
            {field: 'notes', type: 'textarea'},
            {field: 'active'},
            {field: 'sortOrder'},
            {field: 'lastUpdated', type: 'displayField'},
            {field: 'lastUpdatedBy', type: 'displayField'}
        ]
    });

    render() {
        return restGrid({model: this.gridModel});
    }

    loadAsync() {
        return this.store.loadAsync();
    }
}