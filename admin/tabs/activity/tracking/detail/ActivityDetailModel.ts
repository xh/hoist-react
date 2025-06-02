/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilename} from '@xh/hoist/admin/AdminUtils';
import * as Col from '@xh/hoist/admin/columns';
import {ActivityTrackingDataFieldSpec} from '@xh/hoist/admin/tabs/activity/tracking/datafields/DataFieldsEditorModel';
import {FormModel} from '@xh/hoist/cmp/form';
import {ColumnSpec, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, lookup, managed, PersistOptions, PlainObject} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {timestampReplacer} from '@xh/hoist/format';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {get, isString} from 'lodash';

/**
 * Interface to cover the two usages of this component - {@link ActivityTrackingModel} and {@link ClientDetailModel}
 */
export interface ActivityDetailProvider {
    isActivityDetailProvider: true;
    trackLogs: PlainObject[];
    persistWith?: PersistOptions;
    colDefaults?: Record<string, Partial<ColumnSpec>>;
    dataFields?: ActivityTrackingDataFieldSpec[];
    dataFieldCols?: ColumnSpec[];
}

export class ActivityDetailModel extends HoistModel {
    @lookup(model => {
        return model.isActivityDetailProvider ?? false;
    })
    parentModel: ActivityDetailProvider;

    @managed @observable.ref gridModel: GridModel;
    @managed @observable.ref formModel: FormModel;

    /**
     * Optional dot-delimited path(s) to filter the displayed `data` payload down to a particular
     * node or nodes, for easier browsing of records with a large data payload. Multiple paths
     * can be separated with `|`.
     */
    @bindable formattedDataFilterPath: string;

    /** Stringified, pretty-printed, optionally path-filtered `data` payload. */
    @observable formattedData: string;

    get dataFields(): ActivityTrackingDataFieldSpec[] {
        return this.parentModel?.dataFields ?? [];
    }

    get dataFieldCols(): ColumnSpec[] {
        return this.parentModel?.dataFieldCols ?? [];
    }

    @computed
    get hasExtraTrackData(): boolean {
        return this.gridModel?.selectedRecord?.data.data != null;
    }

    @computed
    get hasSelection() {
        return this.gridModel?.selectedRecord != null;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        if (this.parentModel.persistWith) {
            this.persistWith = {...this.parentModel.persistWith, path: 'activityDetail'};
            this.markPersist('formattedDataFilterPath', {
                path: `${this.persistWith.path}.formattedDataFilterPath`
            });
        }

        this.addReaction(
            {
                track: () => this.dataFields,
                run: () => this.createAndSetCoreModels(),
                fireImmediately: true
            },
            {
                track: () => this.parentModel.trackLogs,
                run: trackLogs => this.showTrackLogsAsync(trackLogs)
            },
            {
                track: () => this.gridModel.selectedRecord,
                run: detailRec => this.showEntryDetail(detailRec)
            },
            {
                track: () => this.formattedDataFilterPath,
                run: () => this.updateFormattedData()
            }
        );
    }

    //------------------
    // Implementation
    //------------------
    private async showTrackLogsAsync(trackLogs: PlainObject[]) {
        const {gridModel} = this;
        gridModel.loadData(trackLogs);
        await gridModel.preSelectFirstAsync();
    }

    /** Extract data from a (detail) grid record and flush it into our form for display. */
    @action
    private showEntryDetail(detailRec: StoreRecord) {
        this.formModel.init(detailRec?.data ?? {});
        this.updateFormattedData();
    }

    @action
    private updateFormattedData() {
        const {gridModel, formattedDataFilterPath} = this,
            trackData = gridModel.selectedRecord?.data.data;

        if (!trackData) {
            this.formattedData = '';
            return;
        }

        let parsed = JSON.parse(trackData),
            toFormat = parsed;

        if (formattedDataFilterPath) {
            const paths = formattedDataFilterPath.split('|');
            if (paths.length > 1) {
                toFormat = {};
                paths.forEach(path => (toFormat[path.trim()] = get(parsed, path.trim())));
            } else {
                toFormat = get(parsed, formattedDataFilterPath.trim());
            }
        }

        this.formattedData = JSON.stringify(toFormat, timestampReplacer(), 2);
    }

    //------------------------
    // Core data-handling models
    //------------------------
    @action
    private createAndSetCoreModels() {
        this.gridModel = this.createGridModel();
        this.formModel = this.createSingleEntryFormModel();
    }

    private createGridModel(): GridModel {
        const {persistWith, parentModel, dataFieldCols} = this,
            colDefaults = parentModel.colDefaults ?? {},
            hidden = true,
            pinned = true;

        // Done
        return new GridModel({
            persistWith: persistWith ? {...persistWith, path: `${persistWith.path}.grid`} : null,
            sortBy: 'dateCreated|desc',
            colChooserModel: {height: 450},
            enableExport: true,
            filterModel: false,
            exportOptions: {
                columns: 'ALL',
                filename: exportFilename('activity-detail')
            },
            emptyText: 'Select a group on the left to see detailed tracking logs.',
            columns: [
                {...Col.entryId, hidden, pinned},
                {...Col.severityIcon, pinned},
                {...Col.impersonatingFlag, pinned},
                {...Col.userAlertedFlag, hidden, pinned},
                {...Col.userMessageFlag, hidden, pinned},
                {...Col.username, pinned},
                {...Col.impersonating, hidden},
                {...Col.category},
                {...Col.msg},
                {...Col.errorName, hidden},
                {...Col.elapsed},
                {...Col.deviceIcon},
                {...Col.browser, hidden},
                {...Col.userAgent, hidden},
                {...Col.appVersion, hidden},
                {...Col.loadId, hidden},
                {...Col.tabId},
                {...Col.correlationId, hidden},
                {...Col.appEnvironment, hidden},
                {...Col.instance, hidden},
                {...Col.urlPathOnly},
                {...Col.data, hidden},
                {...Col.dateCreatedNoYear, displayName: 'Timestamp', chooserGroup: 'Core Data'},
                ...dataFieldCols
            ].map(it => {
                const fieldName = isString(it.field) ? it.field : it.field.name;
                return {...it, ...colDefaults[fieldName]};
            })
        });
    }

    // TODO - don't base on grid cols
    private createSingleEntryFormModel(): FormModel {
        return new FormModel({
            readonly: true,
            fields: this.gridModel
                .getLeafColumns()
                .map(it => ({name: it.field, displayName: it.headerName as string}))
        });
    }
}
