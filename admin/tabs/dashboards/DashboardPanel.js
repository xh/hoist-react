/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from 'hoist/core';
import {baseCol} from 'hoist/columns/Core';
import {dateTimeCol} from 'hoist/columns/DatesTimes';
import {restGrid, RestGridModel, RestStore} from 'hoist/cmp/rest';

import {usernameCol} from '../../columns/Columns';

@HoistComponent()
export class DashboardPanel extends Component {

    localModel = new RestGridModel({
        store: new RestStore({
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
        }),
        actionWarning: {
            edit: 'Are you sure you want to edit this user\'s dashboard?',
            del: 'Are you sure you want to delete this user\'s dashboard?'
        },
        unit: 'dashboard',
        filterFields: ['appCode', 'username'],

        columns: [
            baseCol({field: 'appCode', fixedWidth: 140}),
            usernameCol({fixedWidth: 120}),
            dateTimeCol({field: 'lastUpdated', headerName: 'Last Updated', fixedWidth: 160, align: 'right'}),
            baseCol({field: 'definition', minWidth: 120, flex: 1})
        ],
        editors: [
            {field: 'appCode'},
            {field: 'username'},
            {field: 'definition'},
            {field: 'lastUpdated'}
        ]
    });

    render() {
        return restGrid({model: this.model});
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}
