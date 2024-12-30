/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns/Rest';
import {LogViewerModel} from '@xh/hoist/admin/tabs/cluster/logs/LogViewerModel';
import {HoistModel, managed, lookup, LoadSpec} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {RestGridModel} from '@xh/hoist/desktop/cmp/rest';

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
                fieldDefaults: {disableXssProtection: true},
                fields: [
                    {
                        name: 'name',
                        type: 'string',
                        displayName: 'Package/Class',
                        required: true
                    },
                    {name: 'level', type: 'string', displayName: 'Override', lookupName: 'levels'},
                    {name: 'defaultLevel', type: 'string', displayName: 'Initial', editable: false},
                    {
                        name: 'effectiveLevel',
                        type: 'string',
                        displayName: 'Effective',
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
                {field: 'defaultLevel', width: 110},
                {field: 'level', width: 110},
                {field: 'effectiveLevel', width: 110},
                Col.lastUpdated,
                Col.lastUpdatedBy
            ],
            editors: [
                {
                    field: 'name',
                    formField: {
                        item: textInput({
                            placeholder: 'com.myapp.MyClassWithLogging (or partial path)'
                        })
                    }
                },
                {
                    field: 'level',
                    formField: {
                        info: 'Hint - clear to leave at default while keeping record in place to adjust again later.'
                    }
                },
                {field: 'lastUpdated'},
                {field: 'lastUpdatedBy'}
            ]
        });
    }
}
