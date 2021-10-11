import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {managed, HoistModel, XH} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {
    browserCol,
    categoryCol,
    dataCol,
    dateCreatedCol,
    deviceCol,
    elapsedCol,
    entryIdCol,
    impersonatingCol,
    impersonatingFlagCol,
    msgCol,
    usernameCol,
    userAgentCol
} from '@xh/hoist/admin/columns';

export class ActivityDetailModel extends HoistModel {

    /** @member {ActivityTrackingModel} */
    parentModel;
    /** @member {GridModel} */
    @managed gridModel;
    /** @member {FormModel} */
    @managed formModel;

    @observable formattedData;

    constructor({parentModel}) {
        super();
        makeObservable(this);
        this.parentModel = parentModel;

        this.gridModel = new GridModel({
            sortBy: 'dateCreated|desc',
            colChooserModel: true,
            enableExport: true,
            filterModel: true,
            exportOptions: {
                columns: 'ALL',
                filename: `${XH.appCode}-activity-detail`
            },
            emptyText: 'Select a group on the left to see detailed tracking logs.',
            columns: [
                {...impersonatingFlagCol},
                {...entryIdCol, hidden: true},
                {...usernameCol, filterable: true},
                {...impersonatingCol, hidden: true},
                {...categoryCol, filterable: true},
                {...msgCol, filterable: true},
                {...dataCol, hidden: true},
                {...deviceCol, filterable: true},
                {...browserCol, filterable: true},
                {...userAgentCol, hidden: true, filterable: true},
                {...elapsedCol, filterable: true},
                {...dateCreatedCol, displayName: 'Timestamp', filterable: true}
            ]
        });

        this.formModel = new FormModel({
            readonly: true,
            fields: this.gridModel.columns.map(it => ({name: it.field, displayName: it.headerName}))
        });

        this.addReaction({
            track: () => this.parentModel.gridModel.selectedRecord,
            run: (aggRec) => this.showActivityEntriesAsync(aggRec)
        });

        this.addReaction({
            track: () => this.gridModel.selectedRecord,
            run: (detailRec) => this.showEntryDetail(detailRec)
        });
    }

    async showActivityEntriesAsync(aggRec) {
        const {gridModel} = this,
            leaves = this.getAllLeafRows(aggRec);

        gridModel.loadData(leaves);
        await gridModel.preSelectFirstAsync();
    }

    // Extract all leaf, track-entry-level rows from an aggregate record (at any level).
    getAllLeafRows(aggRec, ret = []) {
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
    showEntryDetail(detailRec) {
        const recData = detailRec?.data ?? {},
            trackData = recData.data;

        this.formModel.init(recData);

        let formattedTrackData = trackData;
        if (formattedTrackData) {
            try {
                formattedTrackData = JSON.stringify(JSON.parse(trackData), null, 2);
            } catch (ignored) {}
        }

        this.formattedData = formattedTrackData;
    }

}
