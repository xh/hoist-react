import {usernameCol} from '@xh/hoist/admin/columns';
import {FormModel} from '@xh/hoist/cmp/form';
import {dateTimeCol, GridModel} from '@xh/hoist/cmp/grid';
import {managed, HoistModel, XH} from '@xh/hoist/core';
import {numberRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon/Icon';
import {action, observable, makeObservable} from '@xh/hoist/mobx';

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
            exportOptions: {
                columns: 'ALL',
                filename: `${XH.appCode}-activity-detail`
            },
            emptyText: 'Select a group on the left to see detailed tracking logs.',
            columns: [
                {
                    field: 'impersonatingFlag',
                    headerName: Icon.impersonate(),
                    headerTooltip: 'Indicates if the user was impersonating another user during tracked activity.',
                    excludeFromExport: true,
                    resizable: false,
                    align: 'center',
                    width: 50,
                    renderer: (v, {record}) => {
                        const {impersonating} = record.data;
                        return impersonating ?
                            Icon.impersonate({
                                asHtml: true,
                                className: 'xh-text-color-accent',
                                title: `Impersonating ${impersonating}`
                            }) : '';
                    }
                },
                {field: 'id', headerName: 'Entry ID', width: 100, align: 'right', hidden: true},
                {field: 'username', ...usernameCol},
                {field: 'impersonating', width: 140, hidden: true},
                {field: 'category', width: 120},
                {field: 'msg', headerName: 'Message', flex: true, minWidth: 120, autosizeMaxWidth: 400},
                {field: 'data', flex: true, minWidth: 120, autosizeMaxWidth: 400, hidden: true},
                {field: 'device', width: 100},
                {field: 'browser', width: 100},
                {field: 'userAgent', width: 100, hidden: true},
                {
                    field: 'elapsed',
                    headerName: 'Elapsed',
                    width: 120,
                    align: 'right',
                    renderer: numberRenderer({
                        label: 'ms',
                        nullDisplay: '-',
                        formatConfig: {thousandSeparated: false, mantissa: 0}
                    })
                },
                {field: 'dateCreated', headerName: 'Timestamp', ...dateTimeCol}
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

        if (!gridModel.hasSelection) {
            await gridModel.selectFirstAsync();
        }
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