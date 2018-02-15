/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {restGrid, RestGridModel} from 'hoist/rest';

import {baseCol} from 'hoist/columns/Core';
import {nameFlexCol, usernameCol} from '../../columns/Columns';

@observer
export class UserPreferencePanel extends Component {

    model = new RestGridModel({
        url: 'rest/userPreferenceAdmin',
        editWarning: 'Are you sure you want to edit? Editing preferences can break running apps!',
        deleteWarning(records) {
            const count = records.length,
                countMsg = (count === 1 ? 'this preference' : `these ${count} preferences`);

            return `Are you sure you want to delete ${countMsg}? Deleting preferences can break running apps!`;
        },

        recordSpec: {
            fields: [
                {name: 'name', label: 'Pref', lookup: 'names'},
                {name: 'type', label: 'Type'},
                {name: 'username', label: 'User'},
                {name: 'userValue', typeField: 'type', label: 'User Value'},
                {name: 'lastUpdated', type: 'date', label: 'Last Updated', allowNull: true},
                {name: 'lastUpdatedBy', label: 'Last Updated By', allowNull: true}
            ]
        },
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
        return restGrid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}