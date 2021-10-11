/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {
    activeCol,
    activeField,
    codeCol,
    codeField,
    failThresholdCol,
    failThresholdField,
    lastUpdatedByCol,
    lastUpdatedByField,
    lastUpdatedCol,
    lastUpdatedField,
    metricTypeField,
    metricUnitCol,
    metricUnitField,
    nameCol,
    nameField,
    notesCol,
    notesField,
    paramsField,
    sortOrderCol,
    sortOrderField,
    warnThresholdCol,
    warnThresholdField
} from '@xh/hoist/admin/columns';

export const monitorEditorPanel = hoistCmp.factory(
    () => restGrid({model: modelSpec})
);

const modelSpec = {
    persistWith: {localStorageKey: 'xhAdminMonitorState'},
    colChooserModel: true,
    enableExport: true,
    store: {
        url: 'rest/monitorAdmin',
        fieldDefaults: {disableXssProtection: true},
        fields: [
            {...codeField, required: true},
            {...nameField, required: true},
            {...metricTypeField, lookupName: 'metricTypes', required: true},
            {...metricUnitField},
            {...warnThresholdField},
            {...failThresholdField},
            {...paramsField},
            {...notesField},
            {...activeField, defaultValue: true, required: true},
            {...sortOrderField},
            {...lastUpdatedField, editable: false},
            {...lastUpdatedByField, editable: false}
        ]
    },
    unit: 'monitor',
    sortBy: 'sortOrder',
    filterFields: ['code', 'name'],
    columns: [
        {...activeCol},
        {...codeCol},
        {...nameCol},
        {...warnThresholdCol},
        {...failThresholdCol},
        {...metricUnitCol},
        {...notesCol},
        {...lastUpdatedByCol, hidden: true},
        {...lastUpdatedCol, hidden: true},
        {...sortOrderCol}
    ],
    editors: [
        {field: 'code'},
        {field: 'name'},
        {field: 'metricType'},
        {field: 'warnThreshold'},
        {field: 'failThreshold'},
        {field: 'metricUnit'},
        {field: 'params'},
        {field: 'notes', formField: {item: textArea()}},
        {field: 'active'},
        {field: 'sortOrder'},
        {field: 'lastUpdated'},
        {field: 'lastUpdatedBy'}
    ]
};
