/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {boolCheckCol, baseCol} from 'hoist/columns/Core';
import {restGrid, RestGridModel} from 'hoist/rest';

import {nameFlexCol} from '../../columns/Columns';

@observer
export class PreferencePanel extends Component {

    model = new RestGridModel({
        url: 'rest/preferenceAdmin',
        editWarning: 'Are you sure you want to edit? Editing preferences can break running apps!',
        recordSpec: {
            fields: [
                {name: 'name', label: 'Name'},
                {name: 'type', label: 'Type', lookup: 'types'},
                {name: 'defaultValue', label: 'Default Value'},
                {name: 'notes', label: 'Notes'},
                {name: 'local', label: 'Local', type: 'bool'},
                {name: 'lastUpdated', label: 'Last Updated', type: 'date', readOnly: true},
                {name: 'lastUpdatedBy', label: 'Last Updated By', readOnly: true}
            ]
        },
        columns: [
            boolCheckCol({field: 'local', width: 60}),
            nameFlexCol(),
            baseCol({field: 'type', width: 80}),
            baseCol({field: 'defaultValue', flex: 1}),
            baseCol({field: 'notes', flex: 2})
        ],
        editors: [
            {field: 'name'},
            {field: 'type'},
            {field: 'defaultValue'},
            {field: 'local'},
            {field: 'notes'},
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