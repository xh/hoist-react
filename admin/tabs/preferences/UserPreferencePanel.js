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
        fields: [{
            name: 'name',
            label: 'Pref',
            lookupName: 'names',
            lookupStrict: true,
            editable: 'onAdd',
            required: true
        }, {
            name: 'type',
            editable: false
        },{
            name: 'username',
            label: 'User',
            required: true
        }, {
            name: 'userValue',
            typeField: 'type',
            required: true
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
            nameFlexCol(),
            baseCol({field: 'type', width: 80}),
            usernameCol(),
            baseCol({field: 'userValue', flex: 1})
        ],
        editors: [
            {field: 'name'},
            {field: 'username'},
            {field: 'userValue'},
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