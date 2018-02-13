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
import {usernameCol} from '../../columns/Columns';
import {compactDateRenderer, dateTimeRenderer} from '../../../format';

@observer
export class FeedbackPanel extends Component {

    model = new RestGridModel({
        url: 'rest/feedbackAdmin',
        recordSpec: {
            fields: [
                {name: 'username', label: 'User'},
                {name: 'msg', label: 'Message'},
                {name: 'browser', label: 'Browser', readOnly: true},
                {name: 'device', label: 'Device', readOnly: true},
                {name: 'appVersion', label: 'Version', readOnly: true},
                {name: 'appEnvironment', label: 'Environment', readOnly: true},
                {name: 'dateCreated', type: 'date', dateFormat: 'time', label: 'Date', readOnly: true}
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
            {field: 'browser'},
            {field: 'device'},
            {field: 'appVersion'},
            {field: 'appEnvironment'},
            {field: 'dateCreated', renderer: dateTimeRenderer()}
        ]
    });

    render() {
        return restGrid({model: this.model});
    }

    loadAsync() {
        return this.model.loadAsync();
    }
}