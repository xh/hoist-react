/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {usernameCol} from '@xh/hoist/admin/columns';
import {dateTimeCol} from '@xh/hoist/cmp/grid';
import {hoistCmp} from '@xh/hoist/core';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {deleteAction, restGrid} from '@xh/hoist/desktop/cmp/rest';

export const feedbackPanel = hoistCmp.factory(
    () => restGrid({model: modelSpec})
);

const modelSpec = {
    persistWith: {localStorageKey: 'xhAdminFeedbackState'},
    colChooserModel: true,
    enableExport: true,
    emptyText: 'No feedback reported...',
    store: {
        url: 'rest/feedbackAdmin',
        fields: [
            {name: 'username', displayName: 'User'},
            {name: 'msg', displayName: 'Message'},
            {name: 'browser'},
            {name: 'device'},
            {name: 'appVersion', displayName: 'Version'},
            {name: 'appEnvironment', displayName: 'Environment'},
            {name: 'dateCreated', displayName: 'Date', type: 'date'}
        ]
    },
    toolbarActions: [deleteAction],
    menuActions: [deleteAction],
    formActions: [deleteAction],
    unit: 'report',
    sortBy: 'dateCreated|desc',
    filterFields: ['username', 'msg'],
    columns: [
        {field: 'username', ...usernameCol},
        {field: 'browser', width: 120},
        {field: 'device', width: 100},
        {field: 'appVersion', width: 120},
        {field: 'appEnvironment', width: 130},
        {field: 'msg', minWidth: 120, flex: true},
        {field: 'dateCreated', ...dateTimeCol}
    ],
    editors: [
        {field: 'username'},
        {field: 'msg', formField: {item: textArea({height: 100})}},
        {field: 'browser'},
        {field: 'device'},
        {field: 'appVersion'},
        {field: 'appEnvironment'},
        {field: 'dateCreated'}
    ]
};
