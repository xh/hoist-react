/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {observer} from 'hoist/mobx';
import {dateCol} from 'hoist/columns/DatesTimes';
import {restGrid, RestGridModel} from 'hoist/rest';

import {appCodeCol, usernameCol, definitionCol} from '../../columns/Columns';

@observer
export class DashboardPanel extends Component {

    model = new RestGridModel({
        url: 'rest/dashboardAdmin',
        columns: [
            appCodeCol(),
            usernameCol(),
            dateCol({field: 'lastUpdated'}),
            definitionCol()
        ],
        editors: [
            {name: 'appCode', allowBlank: false},
            {name: 'username', allowBlank: true},
            {name: 'definition', allowBlank: false, flex: 1},
            {name: 'lastUpdated', readOnly: true}
        ]
    });

    render() {
        return restGrid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}
