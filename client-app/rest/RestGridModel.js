/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {remove} from 'lodash';
import {XH} from 'hoist';
import {action} from 'hoist/mobx';
import {RecordSpec} from 'hoist/data';
import {GridModel} from 'hoist/grid';
import {RestFormModel} from './RestFormModel';
import {ConfirmModel} from 'hoist/cmp/confirm/ConfirmModel';

/**
 * Core Model for a RestGrid
 */
export class RestGridModel {

    //----------------
    // Properties
    //----------------
    actionEnabled = {
        add: true,
        edit: true,
        del: true
    }

    actionWarning = {
        add: null,
        edit: null,
        del: 'Are you sure you want to delete the selected record(s)?'
    }

    gridModel = null;
    formModel = null;
    recordSpec = null;
    _lookupsLoaded = false;

    confirmModel = new ConfirmModel();

    get url()       {return this.gridModel.url}
    get selection() {return this.gridModel.selection}
    get loadModel() {return this.gridModel.loadModel}
    get records()   {return this.gridModel.records}

    constructor({
        actionEnabled,
        actionWarning,
        recordSpec,
        editors = [],
        dataRoot = 'data',
        ...rest
    }) {
        this.actionEnabled = Object.assign(this.actionEnabled, actionEnabled);
        this.actionWarning = Object.assign(this.actionWarning, actionWarning);
        this.recordSpec = recordSpec instanceof RecordSpec ? recordSpec : new RecordSpec(recordSpec);
        this.formModel = new RestFormModel({parent: this, editors});
        this.gridModel = new GridModel({dataRoot, ...rest});
    }

    async loadAsync() {
        if (!this._lookupsLoaded) {
            const lookupFields = this.recordSpec.fields.filter(it => !!it.lookup);
            if (lookupFields.length) {
                const lookupData = await XH.fetchJson({url: `${this.url}/lookupData`});
                lookupFields.forEach(f => {
                    f.lookupValues = lookupData[f.lookup];
                });
                this._lookupsLoaded = true;
            }
        }

        return this.gridModel.loadAsync();
    }

    //--------------------
    // Context controls
    //--------------------

    getContextMenuItems(params) {
        // would be nice to get an icon for each. icon here is an DOM el or an html string. Not sure we're set up for this yet.
        return [
            {
                name: 'Add Record',
                // is there a better way to convert blueprint icons to html a la XH.glyph.html?
                icon: '<svg class="pt-icon" data-icon="add" width="16" height="16" viewBox="0 0 16 16"><title>add</title><path d="M10.99 6.99h-2v-2c0-.55-.45-1-1-1s-1 .45-1 1v2h-2c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1zm-3-7c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.68 6-6 6z" fill-rule="evenodd"></path></svg>',
                action: () => this.addRecord(),
                tooltip: 'Add record'
            },
            {
                name: 'Edit Record',
                action: () => this.editSelection(),
                disabled: this.selection.isEmpty,
                tooltip: 'Edit record'
            },
            {
                name: 'Delete Record',
                action: () => this.onContextDeleteClick(),
                disabled: this.selection.isEmpty,
                tooltip: 'Delete record'
            },
            'separator',
            {
                name: 'Rest',
                subMenu: [
                    {
                        name: 'Add Record',
                        action: () => this.addRecord(),
                        tooltip: 'Add record'
                    },
                    {
                        name: 'Edit Record',
                        action: () => this.editSelection(),
                        disabled: this.selection.isEmpty,
                        tooltip: 'Edit record'
                    },
                    {
                        name: 'Delete Record',
                        action: () => this.onContextDeleteClick(),
                        disabled: this.selection.isEmpty,
                        tooltip: 'Delete record'
                    }
                ],
                tooltip: 'Demoing nested menus'
            },
            'separator',
            'export' // default option provided by ag-grid
        ];
    }

    onContextDeleteClick = () => {
        const warning = this.actionWarning.del;
        if (warning) {
            this.confirmModel.show({
                message: warning,
                onConfirm: () => this.deleteSelection()
            });
        } else {
            this.deleteSelection();
        }
    }


    //-----------------
    // Actions
    //------------------
    @action
    deleteRecord(rec) {
        const {url, actionEnabled} = this;

        if (!actionEnabled.del) throw XH.exception('Record delete not enabled.');

        return XH.fetchJson({
            url: `${url}/${rec.id}`,
            method: 'DELETE'
        }).then(() => {
            this.noteRecordDeleted(rec);
        }).linkTo(
            this.loadModel
        ).catchDefault();
    }

    @action
    saveRecord(rec) {
        const {url, actionEnabled} = this,
            {isAdd} = this.formModel;

        if (isAdd && !actionEnabled.add) throw XH.exception('Record addition not enabled.');
        if (!isAdd && !actionEnabled.edit) throw XH.exception('Record edits not enabled.');

        XH.fetchJson({
            url,
            method: isAdd ? 'POST' : 'PUT',
            params: {data: JSON.stringify(rec)}
        }).then(response => {
            this.noteRecordUpdated(response.data);
        }).linkTo(
            this.loadModel
        ).catchDefault();
    }

    @action
    addRecord() {
        this.formModel.openAdd();
    }

    @action
    deleteSelection() {
        this.deleteRecord(this.selection.singleRecord);
    }

    @action
    editSelection() {
        this.formModel.openEdit(this.selection.singleRecord);
    }

    //--------------
    // Implementation
    //--------------
    @action
    noteRecordUpdated(rec) {
        const records = this.records,
            idx = records.findIndex(r => r.id === rec.id);

        if (idx < 0) {
            records.push(rec);
        } else {
            records[idx] = rec;
        }
        this.formModel.close();
    }

    @action
    noteRecordDeleted(rec) {
        remove(this.records, r => r.id === rec.id);
        this.formModel.close();
    }
}