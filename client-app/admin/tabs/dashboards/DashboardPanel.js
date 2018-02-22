/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {baseCol} from 'hoist/columns/Core';
import {dateCol} from 'hoist/columns/DatesTimes';
import {restGrid, RestGridModel} from 'hoist/rest';

import {usernameCol} from '../../columns/Columns';

@observer
export class DashboardPanel extends Component {

    model = new RestGridModel({
        url: 'rest/dashboardAdmin',
        actionWarning: {
            edit: 'Are you sure you want to edit this user\'s dashboard?',
            del: 'Are you sure you want to delete this user\'s dashboard?'
        },
        recordSpec: {
            fields: [
                {name: 'appCode', label: 'App Code'},
                {name: 'username', label: 'User'},
                {name: 'definition', label: 'Definition', type: 'json'},
                {name: 'lastUpdated', label: 'Last Updated', allowNull: true}
            ]
        },
        columns: [
            baseCol({field: 'appCode', width: 100}),
            usernameCol(),
            dateCol({field: 'lastUpdated'}),
            baseCol({field: 'definition', flex: 1})
        ],
        editors: [
            {field: 'appCode'},
            {field: 'username'},
            {field: 'definition'},
            {field: 'lastUpdated', type: 'displayField'}
        ]
    });

    render() {
        return restGrid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}
