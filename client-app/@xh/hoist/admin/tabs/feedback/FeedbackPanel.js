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
import {usernameCol} from '../../columns/Columns';
import {compactDateRenderer} from '../../../format';

@hoistComponent()
export class FeedbackPanel extends Component {

    store = new RestStore({
        url: 'rest/feedbackAdmin',
        fields: [
            {name: 'username', label: 'User'},
            {name: 'msg', label: 'Message'},
            {name: 'browser', label: 'Browser', readOnly: true},
            {name: 'device', label: 'Device', readOnly: true},
            {name: 'appVersion', label: 'Version', readOnly: true},
            {name: 'appEnvironment', label: 'Environment', readOnly: true},
            {name: 'dateCreated', type: 'date', dateFormat: 'time', label: 'Date', readOnly: true, allowNull: true}
        ]
    });

    gridModel = new RestGridModel({
        store: this.store,
        columns: [
            usernameCol(),
            baseCol({field: 'msg', text: 'Message', width: 60}),
            baseCol({field: 'browser', text: 'Browser', width: 100}),
            baseCol({field: 'device', text: 'Device', width: 60}),
            baseCol({field: 'appVersion', text: 'Version', width: 100}),
            baseCol({field: 'appEnvironment', text: 'Environment', width: 100}),
            baseCol({field: 'dateCreated', text: 'Date', width: 100, renderer: compactDateRenderer()})
        ],
        editors: [
            {field: 'username'},
            {field: 'msg', type: 'textarea'},
            {field: 'browser'},
            {field: 'device'},
            {field: 'appVersion'},
            {field: 'appEnvironment'},
            {field: 'dateCreated', type: 'displayField'}
        ]
    });

    render() {
        return restGrid({model: this.gridModel});
    }

    loadAsync() {
        return this.store.loadAsync();
    }
}