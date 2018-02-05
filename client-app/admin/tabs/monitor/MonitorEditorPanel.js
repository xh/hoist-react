/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {baseCol, boolCheckCol} from 'hoist/columns/Core';
import {restGrid, RestGridModel} from 'hoist/rest';

import {nameFlexCol} from '../../columns/Columns';


@observer
export class MonitorEditorPanel extends Component {

    model = new RestGridModel({
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
                {name: 'notes', label: 'Notes'},
                {name: 'active', label: 'Active', type: 'boolean'},
                {name: 'sortOrder', label: 'Sort', type: 'int', allowNull: true},
                {name: 'lastUpdated', label: 'Last Updated', type: 'date', readOnly: true},
                {name: 'lastUpdatedBy', label: 'Last Updated By', readOnly: true}
            ]
        },
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
            {field: 'lastUpdated'},
            {field: 'lastUpdatedBy'}
        ]
    });

    render() {
        return restGrid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}