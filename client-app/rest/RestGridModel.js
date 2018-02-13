/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {forOwn} from 'lodash';
import {XH} from 'hoist';
import {observable, computed, action} from 'hoist/mobx';
import {GridModel} from 'hoist/grid';
import {RecordSpec} from 'hoist/data';
import {ConfirmModel} from 'hoist/cmp/confirm/ConfirmModel';
import {remove} from 'lodash';

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
    editors = [];

    _lookupsLoaded = false;

    // If not null, this will be displayed in a modal dialogs
    @observable formRecord = null;

    confirmModel = new ConfirmModel();

    get url()       {return this.gridModel.url}
    get selection() {return this.gridModel.selection}
    get loadModel() {return this.gridModel.loadModel}
    get records()   {return this.gridModel.records}

    @computed
    get formIsAdd() {
        const rec = this.formRecord;
        return (rec && rec.id === null);
    }

    @computed
    get formIsValid() {
        const fieldSpecs = this.recordSpec.fields;
        let valid = true;
        forOwn(this.formRecord, (v, k) => {
            const spec = fieldSpecs.find(it => it.name === k);
            if (spec && !spec.allowNull && (v == null || v === '')) valid = false;
        });
        return valid;
    }

    @computed
    get formIsWritable() {
        const {formIsAdd, enableAdd, enableEdit} = this;
        return (formIsAdd && enableAdd) || (!formIsAdd  && enableEdit);
    }

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
        this.editors = editors;
        this.recordSpec = recordSpec instanceof RecordSpec ? recordSpec : new RecordSpec(recordSpec);
        this.editWarning = editWarning;

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
    closeForm() {
        this.formRecord = null;
    }

    @action
    openAddForm() {
        const newRec = {id: null},
            fieldSpecs = this.recordSpec.fields;

        // must start with full formed dummy rec for validation purposes
        // from MobX: a computed property won't re-run if none of the data used in the previous computation changed.
        fieldSpecs.forEach(spec => {
            newRec[spec.name] = null;
        });

        this.formRecord = newRec;
    }

    @action
    openEditForm(rec)  {
        this.formRecord = Object.assign({}, rec);
    }

    @action
    setFormValue = (field, value) => {
        this.formRecord[field] = value;
    }

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
        const {url, formRecord, formIsWritable, formIsAdd} = this;

        if (!formIsWritable) throw XH.exception('Record save not enabled.');

        XH.fetchJson({
            url,
            method: formIsAdd ? 'POST' : 'PUT',
            params: {data: JSON.stringify(formRecord)}
        }).then(response => {
            this.closeForm();
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
        this.closeForm();
    }

    @action
    noteRecordDeleted(rec) {
        remove(this.records, r => r.id === rec.id);
        this.closeForm();
    }
}