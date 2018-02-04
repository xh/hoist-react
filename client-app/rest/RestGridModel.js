/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from 'hoist';
import {observable, computed, action} from 'hoist/mobx';
import {GridModel} from 'hoist/grid';
import {remove} from 'lodash';

/**
 * * Core Model for a RestGrid
 */
export class RestGridModel extends GridModel {

    //---------------
    // Properties
    //----------------
    enableAdd = true;
    enableEdit = true;
    enableDelete = true;
    editors = [];

    // If not null, this will be displayed in (modal) dialog.
    @observable formRecord = null;   
    
    @computed
    get formIsAdd() {
        const rec = this.formRecord;
        return (rec && rec.id === null);
    }

    @computed
    get formIsValid() {
        return this.formRecord;
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
        editors = [],
        dataRoot = 'data',
        ...rest
    }) {
        super({...rest, dataRoot});
        this.enableAdd = enableAdd;
        this.enableEdit = enableEdit;
        this.enableDelete = enableDelete;
        this.editors = editors;
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
        this.formRecord = {id: null};
    }

    @action
    openEditForm(rec)  {
        this.formRecord = Object.assign({}, rec);
    }

    @action
    setFormValue(field, value) {
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
    saveForm() {
        const {url, formRecord, formIsWritable, formIsAdd} = this;

        if (!formIsWritable) throw XH.exception('Record save not enabled.');

        XH.fetchJson({
            url,
            method: formIsAdd ? 'POST' : 'PUT',
            params: {data: JSON.stringify(formRecord)}
        }).then(response => {
            this.formRecord = null;
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