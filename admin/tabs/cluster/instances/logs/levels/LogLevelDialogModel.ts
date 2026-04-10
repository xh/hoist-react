/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns/Rest';
import {LogViewerModel} from '@xh/hoist/admin/tabs/cluster/instances/logs/LogViewerModel';
import {ColumnSpec} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, lookup, LoadSpec} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {segmentedControl, textInput} from '@xh/hoist/desktop/cmp/input';
import {RestGridModel} from '@xh/hoist/desktop/cmp/rest';
import {Icon} from '@xh/hoist/icon';
import {isNil} from 'lodash';

/**
 * @internal
 */
export class LogLevelDialogModel extends HoistModel {
    @lookup(LogViewerModel)
    parent: LogViewerModel;

    @managed
    gridModel: RestGridModel;

    constructor() {
        super();
        this.gridModel = this.createGridModel();

        // Force a full-reload after any update. Levels cascade, so need to update entire grid
        const {store} = this.gridModel;
        this.addReaction({
            track: () => store.lastLoaded != store.lastUpdated,
            run: async isUpdated => {
                if (isUpdated) await store.loadAsync();
            }
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        this.gridModel.loadAsync(loadSpec);
    }

    private createGridModel() {
        return new RestGridModel({
            persistWith: {localStorageKey: 'xhAdminLogLevelState'},
            colChooserModel: true,
            enableExport: true,
            exportOptions: {filename: exportFilenameWithDate('log-levels')},
            readonly: AppModel.readonly,
            showRefreshButton: true,
            store: {
                url: 'rest/logLevelAdmin',
                fieldDefaults: {enableXssProtection: false},
                fields: [
                    {
                        name: 'name',
                        type: 'string',
                        displayName: 'Package/Class',
                        required: true
                    },
                    {
                        name: 'level',
                        type: 'string',
                        displayName: 'Log Level Override',
                        lookupName: 'levels'
                    },
                    {
                        name: 'suppressStackTrace',
                        type: 'bool',
                        displayName: 'Suppress Stack'
                    },
                    {
                        name: 'includeStartMessages',
                        type: 'bool',
                        displayName: 'Start Msgs'
                    },
                    {
                        name: 'defaultLevel',
                        type: 'string',
                        displayName: 'Log Level',
                        editable: false
                    },
                    {
                        name: 'effectiveLevel',
                        type: 'string',
                        displayName: 'Log Level',
                        editable: false
                    },
                    {
                        name: 'effectiveSuppressStackTrace',
                        type: 'bool',
                        displayName: 'Suppress Stack',
                        editable: false
                    },
                    {
                        name: 'effectiveIncludeStartMessages',
                        type: 'bool',
                        displayName: 'Start Msgs',
                        editable: false
                    },
                    {...(Col.lastUpdated.field as FieldSpec), editable: false},
                    {...(Col.lastUpdatedBy.field as FieldSpec), editable: false}
                ]
            },
            unit: 'log level',
            filterFields: ['name'],
            columns: [
                {field: 'name', width: 400},
                {
                    groupId: 'initial',
                    headerName: 'Initial',
                    headerAlign: 'center',
                    children: [{field: 'defaultLevel', width: 110}]
                },
                {
                    groupId: 'override',
                    headerName: 'Override',
                    headerAlign: 'center',
                    children: [
                        {
                            field: 'level',
                            headerName: 'Log Level',
                            width: 110,
                            renderer: v => (isNil(v) ? '-' : v)
                        },
                        {...customBoolCheckCol, field: 'suppressStackTrace'},
                        {...customBoolCheckCol, field: 'includeStartMessages'}
                    ]
                },
                {
                    groupId: 'effective',
                    headerName: 'Effective',
                    headerAlign: 'center',
                    children: [
                        {field: 'effectiveLevel', headerName: 'Suppress Stack', width: 110},
                        {...customBoolCheckCol, field: 'effectiveSuppressStackTrace'},
                        {...customBoolCheckCol, field: 'effectiveIncludeStartMessages'}
                    ]
                },
                Col.lastUpdated,
                Col.lastUpdatedBy
            ],
            editors: [
                {
                    field: 'name',
                    formField: {
                        item: textInput({
                            placeholder: 'com.myapp.MyClassWithLogging (or partial path)'
                        }),
                        info: 'Hint - leave in place with no values set below to easily adjust again later.'
                    }
                },
                {field: 'level'},
                {
                    field: 'suppressStackTrace',
                    formField: {
                        item: segmentedControl({options: customBoolSegmentOptions})
                    }
                },
                {
                    field: 'includeStartMessages',
                    formField: {
                        item: segmentedControl({options: customBoolSegmentOptions})
                    }
                },
                {field: 'lastUpdated'},
                {field: 'lastUpdatedBy'}
            ]
        });
    }
}

const customBoolSegmentOptions = [
    {label: 'Inherit', value: null},
    {label: 'On', value: true},
    {label: 'Off', value: false}
];

const customBoolCheckCol: ColumnSpec = {
    align: 'center',
    width: 120,
    renderer: v =>
        isNil(v)
            ? '-'
            : v
              ? Icon.check({prefix: 'fas', intent: 'success'})
              : Icon.cross({prefix: 'fas', intent: 'warning'})
};
