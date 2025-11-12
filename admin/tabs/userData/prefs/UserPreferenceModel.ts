/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {RestGridModel} from '@xh/hoist/desktop/cmp/rest';
import {bindable, makeObservable} from '@xh/hoist/mobx';

export class UserPreferenceModel extends HoistModel {
    @managed gridModel: RestGridModel;

    @bindable showEditorDialog: boolean = false;

    constructor() {
        super();
        makeObservable(this);

        const required = true,
            hidden = true;

        this.gridModel = new RestGridModel({
            // Core config
            autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
            colChooserModel: true,
            enableExport: true,
            exportOptions: {filename: exportFilenameWithDate('user-prefs')},
            filterFields: ['name', 'username'],
            groupBy: 'groupName',
            persistWith: {localStorageKey: 'xhAdminUserPreferenceState'},
            readonly: AppModel.readonly,
            selModel: 'multiple',
            sortBy: 'name',
            unit: 'user preference',
            // Store + fields
            store: {
                url: 'rest/userPreferenceAdmin',
                reloadLookupsOnLoad: true,
                fieldDefaults: {enableXssProtection: false},
                fields: [
                    {
                        ...(Col.name.field as FieldSpec),
                        displayName: 'Preference',
                        lookupName: 'names',
                        editable: 'onAdd',
                        required
                    },
                    {
                        ...(Col.groupName.field as FieldSpec),
                        lookupName: 'groupNames',
                        editable: false
                    },
                    {...(Col.type.field as FieldSpec), editable: false},
                    {...(Col.username.field as FieldSpec), required},
                    {...(Col.userValue.field as FieldSpec), typeField: 'type', required},
                    {...(Col.lastUpdated.field as FieldSpec), editable: false},
                    {...(Col.lastUpdatedBy.field as FieldSpec), editable: false}
                ]
            },
            // Cols + editors
            columns: [
                {...Col.name},
                {...Col.type},
                {...Col.username},
                {...Col.groupName, hidden},
                {...Col.userValue},
                {...Col.lastUpdatedBy, hidden},
                {...Col.lastUpdated, hidden}
            ],
            editors: [
                {field: 'name'},
                {field: 'username'},
                {field: 'userValue'},
                {field: 'lastUpdated'},
                {field: 'lastUpdatedBy'}
            ]
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            await this.gridModel.loadAsync(loadSpec);
        } catch (e) {
            XH.handleException(e);
        }
    }
}
