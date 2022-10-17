/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {XH, hoistCmp} from '@xh/hoist/core';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {deleteAction, restGrid} from '@xh/hoist/desktop/cmp/rest';
import * as Col from '@xh/hoist/admin/columns';

export const feedbackPanel = hoistCmp.factory(
    () => {
        const readonly = !XH.getUser().isHoistAdmin;
        return restGrid({model: {...modelSpec, readonly}});
    }
);

const modelSpec = {
    persistWith: {localStorageKey: 'xhAdminFeedbackState'},
    colChooserModel: true,
    enableExport: true,
    emptyText: 'No feedback reported...',
    store: {
        url: 'rest/feedbackAdmin',
        fields: [
            {...Col.username.field},
            {...Col.msg.field},
            {...Col.browser.field},
            {...Col.device.field},
            {...Col.appVersion.field, displayName: 'Version'},
            {...Col.appEnvironment.field},
            {...Col.dateCreated.field, displayName: 'Date'}
        ]
    },
    toolbarActions: [deleteAction],
    menuActions: [deleteAction],
    formActions: [deleteAction],
    unit: 'report',
    sortBy: 'dateCreated|desc',
    filterFields: ['username', 'msg'],
    columns: [
        {...Col.username},
        {...Col.browser},
        {...Col.device},
        {...Col.appVersion, displayName: 'Version'},
        {...Col.appEnvironment},
        {...Col.msg},
        {...Col.dateCreated, displayName: 'Date'}
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
