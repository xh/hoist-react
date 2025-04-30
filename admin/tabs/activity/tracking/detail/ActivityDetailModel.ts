/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilename} from '@xh/hoist/admin/AdminUtils';
import * as Col from '@xh/hoist/admin/columns';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {timestampReplacer} from '@xh/hoist/format';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {get} from 'lodash';
import {ActivityTrackingModel} from '../ActivityTrackingModel';

export class ActivityDetailModel extends HoistModel {
    @lookup(ActivityTrackingModel) activityTrackingModel: ActivityTrackingModel;

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

    @computed
    get hasExtraTrackData(): boolean {
        return this.gridModel.selectedRecord?.data.data != null;
    }

    @computed
    get hasSelection() {
        return this.gridModel.selectedRecord != null;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.markPersist('formattedDataFilterPath', this.activityTrackingModel.persistWith);

        this.addReaction(
            {
                track: () => this.activityTrackingModel.dataFields,
                run: () => this.createAndSetCoreModels(),
                fireImmediately: true
            },
            {
                track: () => this.activityTrackingModel.gridModel.selectedRecord,
                run: aggRec => this.showActivityEntriesAsync(aggRec)
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
    private async showActivityEntriesAsync(aggRec: StoreRecord) {
        const {gridModel} = this,
            leaves = this.getAllLeafRows(aggRec);

        gridModel.loadData(leaves);
        await gridModel.preSelectFirstAsync();
    }

    // Extract all leaf, track-entry-level rows from an aggregate record (at any level).
    private getAllLeafRows(aggRec: StoreRecord, ret = []) {
        if (!aggRec) return [];

        if (aggRec.children.length) {
            aggRec.children.forEach(childRec => this.getAllLeafRows(childRec, ret));
        } else if (aggRec.raw.leafRows) {
            aggRec.raw.leafRows.forEach(leaf => {
                ret.push({...leaf});
            });
        }

        return ret;
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
        const hidden = true;
        return new GridModel({
            persistWith: {...this.activityTrackingModel.persistWith, path: 'detailGrid'},
            sortBy: 'dateCreated|desc',
            colChooserModel: true,
            enableExport: true,
            filterModel: false,
            exportOptions: {
                columns: 'ALL',
                filename: exportFilename('activity-detail')
            },
            emptyText: 'Select a group on the left to see detailed tracking logs.',
            columns: [
                {...Col.impersonatingFlag},
                {...Col.entryId, hidden},
                {...Col.username},
                {...Col.impersonating, hidden},
                {...Col.category},
                {...Col.msg},
                {...Col.browser},
                {...Col.device},
                {...Col.userAgent, hidden},
                {...Col.appVersion},
                {...Col.loadId},
                {...Col.tabId},
                {...Col.appEnvironment, hidden},
                {...Col.data, hidden},
                {...Col.url},
                {...Col.instance, hidden},
                {...Col.correlationId},
                {...Col.severity, hidden},
                {...Col.elapsed},
                {...Col.dateCreatedWithSec, displayName: 'Timestamp'},
                ...this.activityTrackingModel.dataFieldCols
            ]
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
