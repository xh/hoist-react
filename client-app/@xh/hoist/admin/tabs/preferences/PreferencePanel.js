/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {boolCheckCol, baseCol} from 'hoist/columns/Core';
import {restGrid, RestGridModel, RestStore} from 'hoist/rest';

import {nameFlexCol} from '../../columns/Columns';

@hoistComponent()
export class PreferencePanel extends Component {

    store = new RestStore({
        url: 'rest/preferenceAdmin',
        fields: [
            {name: 'name', label: 'Name'},
            {name: 'type', label: 'Type', lookup: 'types'},
            {name: 'defaultValue',  typeField: 'type', label: 'Default Value'},
            {name: 'notes', label: 'Notes', allowNull: true},
            {name: 'local', label: 'Local', type: 'bool'},
            {name: 'lastUpdated', label: 'Last Updated', type: 'date', readOnly: true, allowNull: true},
            {name: 'lastUpdatedBy', label: 'Last Updated By', readOnly: true, allowNull: true}
        ]
    });

    gridModel = new RestGridModel({
        store: this.store,
        actionWarning: {
            edit: 'Are you sure you want to edit? Editing preferences can break running apps!',
            del: 'Are you sure you want to delete? Deleting preferences can break running apps!'
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
            {field: 'type', additionsOnly: true},
            {field: 'defaultValue'},
            {field: 'local'},
            {field: 'notes'},
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