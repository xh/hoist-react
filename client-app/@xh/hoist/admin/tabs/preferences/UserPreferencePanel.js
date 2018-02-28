/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {restGrid, RestGridModel, RestStore} from 'hoist/rest';
import {baseCol} from 'hoist/columns/Core';

import {nameFlexCol, usernameCol} from '../../columns/Columns';

@hoistComponent()
export class UserPreferencePanel extends Component {

    store = new RestStore({
        url: 'rest/userPreferenceAdmin',
        fields: [
            {name: 'name', label: 'Pref', lookup: 'names'},
            {name: 'type', label: 'Type'},
            {name: 'username', label: 'User'},
            {name: 'userValue', typeField: 'type', label: 'User Value'},
            {name: 'lastUpdated', type: 'date', label: 'Last Updated', allowNull: true},
            {name: 'lastUpdatedBy', label: 'Last Updated By', allowNull: true}
        ]
    });

    gridModel = new RestGridModel({
        store: this.store,
        columns: [
            nameFlexCol(),
            baseCol({field: 'type', width: 80}),
            usernameCol(),
            baseCol({field: 'userValue', flex: 1})
        ],
        editors: [
            {field: 'name', additionsOnly: true},
            {field: 'username'},
            {field: 'userValue'},
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