/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {restGrid, RestGridModel} from 'hoist/rest';
import {baseCol} from 'hoist/columns/Core';
import {usernameCol} from '../../columns/Columns';
import {compactDateRenderer} from '../../../format';

@hoistComponent()
export class FeedbackPanel extends Component {

    gridModel = new RestGridModel({
        url: 'rest/feedbackAdmin',
        actionEnabled: {
            add: false
        },
        recordSpec: {
            fields: [
                {name: 'username', label: 'User'},
                {name: 'msg', label: 'Message'},
                {name: 'browser', label: 'Browser'},
                {name: 'device', label: 'Device'},
                {name: 'appVersion', label: 'Version'},
                {name: 'appEnvironment', label: 'Environment'},
                {name: 'dateCreated', label: 'Date', allowNull: true}
            ]
        },
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
            {field: 'browser', type: 'displayField'},
            {field: 'device', type: 'displayField'},
            {field: 'appVersion', type: 'displayField'},
            {field: 'appEnvironment', type: 'displayField'},
            {field: 'dateCreated', type: 'displayField'}
        ]
    });

    render() {
        return restGrid({model: this.gridModel});
    }

    loadAsync() {
        return this.gridModel.loadAsync();
    }
}