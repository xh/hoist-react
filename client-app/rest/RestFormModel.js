/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {forOwn} from 'lodash';
import {observable, computed, action} from 'hoist/mobx';
import {ConfirmModel} from 'hoist/cmp/confirm/ConfirmModel';

export class RestFormModel {

    //---------------
    // Properties
    //----------------
    enableAdd = true;
    enableEdit = true;
    enableDelete = true;

    recordSpec = null;
    editors = [];

    confirmModel = new ConfirmModel();

    // If not null, this will be displayed in a modal dialogs
    @observable formRecord = null;

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

    constructor(
        enableAdd,
        enableEdit,
        enableDelete,
        recordSpec,
        editWarning,
        editors
    ) {
        this.enableAdd = enableAdd;
        this.enableEdit = enableEdit;
        this.enableDelete = enableDelete;
        this.editors = editors;
        this.recordSpec = recordSpec; // need this?
        this.editWarning = editWarning;
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

}