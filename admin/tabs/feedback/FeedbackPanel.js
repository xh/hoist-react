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
        fields: [{
            name: 'username',
            label: 'User'
        }, {
            name: 'msg',
            label: 'Message'
        }, {
            name: 'browser'
        }, {
            name: 'device'
        }, {
            name: 'appVersion',
            label: 'Version'
        }, {
            name: 'appEnvironment',
            label: 'Environment'
        }, {
            name: 'dateCreated',
            label: 'Date',
            type: 'date'
        }]
    });

    gridModel = new RestGridModel({
        store: this.store,
        actionEnabled: {
            add: false,
            edit: false
        },
        columns: [
            baseCol({
                field: 'dateCreated',
                headerName: 'Date',
                fixedWidth: 100,
                align: 'right',
                valueFormatter: compactDateRenderer()
            }),
            usernameCol({fixedWidth: 120}),
            baseCol({field: 'msg', headerName: 'Message', minWidth: 60, flex: 1}),
            baseCol({field: 'browser', fixedWidth: 120}),
            baseCol({field: 'device', fixedWidth: 120}),
            baseCol({field: 'appVersion', headerName: 'Version', fixedWidth: 120}),
            baseCol({field: 'appEnvironment', headerName: 'Environment', fixedWidth: 120})
        ],
        editors: [
            {field: 'username'},
            {field: 'msg', type: 'textarea'},
            {field: 'browser'},
            {field: 'device'},
            {field: 'appVersion'},
            {field: 'appEnvironment'},
            {field: 'dateCreated'}
        ]
    });

    render() {
        return restGrid({model: this.gridModel});
    }

    async loadAsync() {
        return this.store.loadAsync();
    }
}