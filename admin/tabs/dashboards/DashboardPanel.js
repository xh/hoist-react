/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {baseCol} from 'hoist/columns/Core';
import {dateCol} from 'hoist/columns/DatesTimes';
import {restGrid, RestGridModel, RestStore} from 'hoist/rest';

import {usernameCol} from '../../columns/Columns';

@hoistComponent()
export class DashboardPanel extends Component {

    store = new RestStore({
        url: 'rest/dashboardAdmin',
        fields: [
            {
                name: 'appCode',
                required: true
            },
            {
                name: 'username',
                label: 'User',
                required: true
            },
            {
                name: 'definition',
                type: 'json',
                required: true
            },
            {
                name: 'lastUpdated',
                type: 'date',
                editable: false
            }
        ]
    });

    gridModel = new RestGridModel({
        store: this.store,
        actionWarning: {
            edit: 'Are you sure you want to edit this user\'s dashboard?',
            del: 'Are you sure you want to delete this user\'s dashboard?'
        },

        columns: [
            baseCol({field: 'appCode', width: 100}),
            usernameCol(),
            dateCol({field: 'lastUpdated'}),
            baseCol({field: 'definition'})
        ],
        editors: [
            {field: 'appCode'},
            {field: 'username'},
            {field: 'definition'},
            {field: 'lastUpdated'}
        ]
    });

    render() {
        return restGrid({model: this.gridModel});
    }

    async loadAsync() {
        return this.store.loadAsync();
    }
}
