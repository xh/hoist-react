/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import '@xh/hoist/desktop/register';
import {GridModel} from '@xh/hoist/cmp/grid';
import {RecordActionSpec} from '@xh/hoist/data';
import {RestGridModel} from '@xh/hoist/desktop/cmp/rest/RestGridModel';
import {Icon} from '@xh/hoist/icon/Icon';

export const addAction: RecordActionSpec = {
    text: 'Add',
    icon: Icon.add(),
    intent: 'success',
    actionFn: ({gridModel}) => getRGM(gridModel).addRecord(),
    displayFn: ({gridModel}) => ({hidden: getRGM(gridModel).readonly}),
    testId: 'add-action-button'
};

export const editAction: RecordActionSpec = {
    text: 'Edit',
    icon: Icon.edit(),
    intent: 'primary',
    recordsRequired: 1,
    actionFn: ({record, gridModel}) => getRGM(gridModel).editRecord(record),
    displayFn: ({gridModel}) => ({hidden: getRGM(gridModel).readonly}),
    testId: 'edit-action-button'
};

export const viewAction: RecordActionSpec = {
    text: 'View',
    icon: Icon.search(),
    recordsRequired: 1,
    actionFn: ({record, gridModel}) => getRGM(gridModel).viewRecord(record),
    testId: 'view-action-button'
};

export const cloneAction: RecordActionSpec = {
    text: 'Clone',
    icon: Icon.copy(),
    recordsRequired: 1,
    actionFn: ({record, gridModel}) => getRGM(gridModel).cloneRecord(record),
    displayFn: ({gridModel}) => ({hidden: getRGM(gridModel).readonly}),
    testId: 'clone-action-button'
};

export const deleteAction: RecordActionSpec = {
    text: 'Delete',
    icon: Icon.delete(),
    intent: 'danger',
    recordsRequired: true,
    displayFn: ({gridModel, record}) => ({
        hidden: (record && record.id === null) || getRGM(gridModel).readonly // Hide this action if we are acting on a "new" record
    }),
    actionFn: ({gridModel}) => getRGM(gridModel).confirmDeleteRecords(),
    testId: 'delete-action-button'
};

function getRGM(gridModel: GridModel): RestGridModel {
    return gridModel.appData.restGridModel as RestGridModel;
}
