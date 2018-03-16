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

import {nameCol, usernameCol} from '../../columns/Columns';

@hoistComponent()
export class UserPreferencePanel extends Component {

    store = new RestStore({
        url: 'rest/userPreferenceAdmin',
        fields: [
            {
                name: 'name',
                label: 'Pref',
                lookupName: 'names',
                lookupStrict: true,
                editable: 'onAdd',
                required: true
            },
            {
                name: 'type',
                editable: false
            },
            {
                name: 'username',
                label: 'User',
                required: true
            },
            {
                name: 'userValue',
                typeField: 'type',
                required: true
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
        columns: [
            nameCol({fixedWidth: 200}),
            baseCol({field: 'type', fixedWidth: 70}),
            usernameCol({fixedWidth: 120}),
            baseCol({field: 'userValue', minWidth: 200, flex: 1})
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

    async loadAsync() {
        return this.store.loadAsync();
    }
}