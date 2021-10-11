/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {deleteAction, restGrid} from '@xh/hoist/desktop/cmp/rest';
import {
    appEnvironmentCol,
    appEnvironmentField,
    appVersionCol,
    appVersionField,
    browserCol,
    browserField,
    dateCreatedCol,
    dateCreatedField,
    deviceCol,
    deviceField,
    msgCol,
    msgField,
    usernameCol,
    usernameField
} from '@xh/hoist/admin/columns';

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
            {...usernameField},
            {...msgField},
            {...browserField},
            {...deviceField},
            {...appVersionField, displayName: 'Version'},
            {...appEnvironmentField},
            {...dateCreatedField, displayName: 'Date'}
        ]
    },
    toolbarActions: [deleteAction],
    menuActions: [deleteAction],
    formActions: [deleteAction],
    unit: 'report',
    sortBy: 'dateCreated|desc',
    filterFields: ['username', 'msg'],
    columns: [
        {...usernameCol},
        {...browserCol},
        {...deviceCol},
        {...appVersionCol, displayName: 'Version'},
        {...appEnvironmentCol},
        {...msgCol},
        {...dateCreatedCol, displayName: 'Date'}
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
