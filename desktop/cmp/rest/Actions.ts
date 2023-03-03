/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import '@xh/hoist/desktop/register';
import {RecordActionSpec} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon/Icon';

export const addAction: RecordActionSpec = {
    text: 'Add',
    icon: Icon.add(),
    intent: 'success',
    actionFn: ({gridModel}) => gridModel.appData.restGridModel.addRecord(),
    displayFn: ({gridModel}) => ({hidden: gridModel.appData.restGridModel.readonly})
};

export const editAction: RecordActionSpec = {
    text: 'Edit',
    icon: Icon.edit(),
    intent: 'primary',
    recordsRequired: 1,
    actionFn: ({record, gridModel}) => gridModel.appData.restGridModel.editRecord(record),
    displayFn: ({gridModel}) => ({hidden: gridModel.appData.restGridModel.readonly})
};

export const viewAction: RecordActionSpec = {
    text: 'View',
    icon: Icon.search(),
    recordsRequired: 1,
    actionFn: ({record, gridModel}) => gridModel.appData.restGridModel.viewRecord(record)
};

export const cloneAction: RecordActionSpec = {
    text: 'Clone',
    icon: Icon.copy(),
    recordsRequired: 1,
    actionFn: ({record, gridModel}) => gridModel.appData.restGridModel.cloneRecord(record),
    displayFn: ({gridModel}) => ({hidden: gridModel.appData.restGridModel.readonly})
};

export const deleteAction: RecordActionSpec = {
    text: 'Delete',
    icon: Icon.delete(),
    intent: 'danger',
    recordsRequired: true,
    displayFn: ({gridModel, record}) => ({
        hidden: (record && record.id === null) || gridModel.appData.restGridModel.readonly // Hide this action if we are acting on a "new" record
    }),
    actionFn: ({gridModel}) => gridModel.appData.restGridModel.confirmDeleteRecords()
};
