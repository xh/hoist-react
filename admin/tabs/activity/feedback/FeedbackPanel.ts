/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns';
import {hoistCmp, XH} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {deleteAction, restGrid, RestGridConfig} from '@xh/hoist/desktop/cmp/rest';
import {LocalDate} from '@xh/hoist/utils/datetime';

export const feedbackPanel = hoistCmp.factory(() =>
    restGrid({modelConfig: {...modelSpec, readonly: AppModel.readonly}})
);

const modelSpec: RestGridConfig = {
    persistWith: {localStorageKey: 'xhAdminFeedbackState'},
    colChooserModel: true,
    enableExport: true,
    exportOptions: {filename: `${XH.appCode}-feedback-${LocalDate.today()}`},
    emptyText: 'No feedback reported...',
    store: {
        url: 'rest/feedbackAdmin',
        fields: [
            Col.username.field,
            Col.msg.field,
            Col.browser.field,
            Col.device.field,
            Col.appEnvironment.field,
            {...(Col.appVersion.field as FieldSpec), displayName: 'Version'},
            {...(Col.dateCreated.field as FieldSpec), displayName: 'Date'}
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
