/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilename, timestampReplacer} from '@xh/hoist/admin/AdminUtils';
import * as Col from '@xh/hoist/admin/columns';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {ActivityTrackingModel} from '../ActivityTrackingModel';
import {fmtJson} from '@xh/hoist/format';

export class ActivityDetailModel extends HoistModel {
    @lookup(ActivityTrackingModel) activityTrackingModel: ActivityTrackingModel;
    @managed gridModel: GridModel;
    @managed formModel: FormModel;
    @observable displayData;

    @computed
    get hasSelection() {
        return this.gridModel.selectedRecord != null;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        const hidden = true;

        this.gridModel = new GridModel({
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
                {...Col.appEnvironment, hidden},
                {...Col.data, hidden},
                {...Col.url},
                {...Col.correlationId},
                {...Col.instance, hidden},
                {...Col.severity, hidden},
                {...Col.elapsed},
                {...Col.dateCreatedWithSec, displayName: 'Timestamp'}
            ]
        });

        this.formModel = new FormModel({
            readonly: true,
            fields: this.gridModel
                .getLeafColumns()
                .map(it => ({name: it.field, displayName: it.headerName as string}))
        });

        this.addReaction(
            {
                track: () => this.activityTrackingModel.gridModel.selectedRecord,
                run: aggRec => this.showActivityEntriesAsync(aggRec)
            },
            {
                track: () => this.gridModel.selectedRecord,
                run: detailRec => this.showEntryDetail(detailRec)
            }
        );
    }

    private async showActivityEntriesAsync(aggRec) {
        const {gridModel} = this,
            leaves = this.getAllLeafRows(aggRec);

        gridModel.loadData(leaves);
        await gridModel.preSelectFirstAsync();
    }

    // Extract all leaf, track-entry-level rows from an aggregate record (at any level).
    private getAllLeafRows(aggRec, ret = []) {
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

    // Extract data from a (detail) grid record and flush it into our form for display.
    // Also parse/format any additional data (as JSON) if provided.
    @action
    private showEntryDetail(detailRec) {
        const recData = detailRec?.data ?? {},
            trackData = recData.data;

        this.formModel.init(recData);

        let formattedTrackData = trackData;
        if (formattedTrackData) {
            try {
                formattedTrackData = fmtJson(trackData, {replacer: timestampReplacer});
            } catch (ignored) {}
        }

        this.displayData = formattedTrackData;
    }
}
