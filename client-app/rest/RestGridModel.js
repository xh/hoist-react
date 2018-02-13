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

    //---------------
    // Properties
    //----------------
    enableAdd = true;
    enableEdit = true;
    enableDelete = true;

    gridModel = null;
    recordSpec = null;
    gridModel = null;
    restFormModel = null;
    _lookupsLoaded = false;

    confirmModel = new ConfirmModel();

    get url()       {return this.gridModel.url}
    get selection() {return this.gridModel.selection}
    get loadModel() {return this.gridModel.loadModel}
    get records()   {return this.gridModel.records}

    constructor({
        enableAdd = true,
        enableEdit = true,
        enableDelete = true,
        recordSpec,
        editWarning,
        editors = [],
        dataRoot = 'data',
        ...rest
    }) {
        this.enableAdd = enableAdd;
        this.enableEdit = enableEdit;
        this.enableDelete = enableDelete;
        this.recordSpec = recordSpec instanceof RecordSpec ? recordSpec : new RecordSpec(recordSpec);
        this.restFormModel = new RestFormModel({editors, editWarning, parentModel: this});
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

    //-----------------
    // Actions
    //------------------
    @action
    deleteRecord(rec) {
        if (!this.enableDelete) throw XH.exception('Record delete not enabled.');

        return XH.fetchJson({
            url: `${this.url}/${rec.id}`,
            method: 'DELETE'
        }).then(() => {
            this.noteRecordDeleted(rec);
        }).linkTo(
            this.loadModel
        ).catchDefault();
    }

    @action
    saveFormRecord() {
        const {url} = this,
            {formRecord, formIsWritable, formIsAdd} = this.restFormModel;

        if (!formIsWritable) throw XH.exception('Record save not enabled.');

        XH.fetchJson({
            url,
            method: formIsAdd ? 'POST' : 'PUT',
            params: {data: JSON.stringify(formRecord)}
        }).then(response => {
            this.noteRecordUpdated(response.data);
        }).linkTo(
            this.loadModel
        ).catchDefault();
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
        this.restFormModel.closeForm();
    }

    @action
    noteRecordDeleted(rec) {
        remove(this.records, r => r.id === rec.id);
        this.restFormModel.closeForm();
    }
}