/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {restGrid, RestGridModel, RestStore} from '@xh/hoist/desktop/cmp/rest';
import {baseCol} from '@xh/hoist/columns/Core';
import {compactDateRenderer} from '@xh/hoist/format';

import {usernameCol} from '@xh/hoist/admin/columns/Columns';

@HoistComponent()
export class FeedbackPanel extends Component {

    localModel = new RestGridModel({
        stateModel: 'xhFeedbackGrid',
        enableColChooser: true,
        enableExport: true,
        store: new RestStore({
            url: 'rest/feedbackAdmin',
            fields: [
                {
                    name: 'username',
                    label: 'User'
                },
                {
                    name: 'msg',
                    label: 'Message'
                },
                {
                    name: 'browser'
                },
                {
                    name: 'device'
                },
                {
                    name: 'appVersion',
                    label: 'Version'
                },
                {
                    name: 'appEnvironment',
                    label: 'Environment'
                },
                {
                    name: 'dateCreated',
                    label: 'Date',
                    type: 'date'
                }
            ]
        }),
        actionEnabled: {
            add: false,
            edit: false
        },
        unit: 'report',
        filterFields: ['username', 'msg'],
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
            baseCol({field: 'device', fixedWidth: 100}),
            baseCol({field: 'appVersion', headerName: 'Version', fixedWidth: 120}),
            baseCol({field: 'appEnvironment', headerName: 'Environment', fixedWidth: 130})
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
        return restGrid({model: this.model});
    }

    async loadAsync() {
        return this.model.loadAsync();
    }
}