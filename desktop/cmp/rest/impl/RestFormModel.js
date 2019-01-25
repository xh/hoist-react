/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from '@xh/hoist/core';
import {observable, computed, action, bindable} from '@xh/hoist/mobx';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {isEqual, cloneDeep} from 'lodash';
import {FormModel, required} from '@xh/hoist/cmp/form';

@HoistModel
export class RestFormModel {

    /** @member {RestGridModel} */
    parent = null;

    /** @member {Object} */
    fieldDefaults = null;

    /** @member {RecordAction[]} */
    actions;

    currentRecord = null;

    readonly = null;
    formModel = null;
    formFields = null;

    @bindable isOpen = false;
    isAdd = null;

    get actionWarning() {return this.parent.actionWarning}
    get store()          {return this.parent.store}
    get loadModel()      {return this.store.loadModel}

    constructor({parent, formFields, actions, fieldDefaults}) {
        this.parent = parent;

        this.formFields = formFields.map(f => this.createFormField(f));
        this.formModel = new FormModel({fields: this.formFields});

        this.fieldDefaults = {commitOnChange: true, minimal: true, ...fieldDefaults};
        this.actions = actions;
    }


    //-----------------
    // Actions
    //-----------------
    @action
    saveRecord() {
        throwIf(this.parent.readonly, 'Record not saved: this grid is read-only.');
        const {isAdd, store, formModel, currentRecord} = this,
            record = {...currentRecord, ...(formModel.getData())},
            saveFn = () => isAdd ? store.addRecordAsync(record) : store.saveRecordAsync(record);
        saveFn()
            .then(() => this.close())
            .linkTo(this.loadModel)
            .catchDefault();
    }

    @action
    close() {
        this.setIsOpen(false)
    }

    openAdd() {
        this.readonly = false;
        this.initForm();
    }

    openEdit(rec)  {
        this.readonly = false;
        this.initForm(rec);
    }

    openView(rec) {
        this.readonly = true;
        this.initForm(rec);
    }

    destroy() {
        XH.safeDestroy(this.formModel)
    }

    //---------------------
    // Implementation
    //---------------------

    @action
    initForm(rec) {
        const {formFields: fields, parent} = this;
        this.currentRecord = rec ? rec : {id: null};

        this.formModel = new FormModel({fields});
        this.formModel.init(rec);
        this.formModel.setReadonly(parent.readonly || this.readonly);

        this.formFields = fields.map(f => rec ? f : {...f, omit: f.readonly});
        this.isAdd = !rec;
        this.setIsOpen(true)
    }

    createFormField(f) {
        const field = cloneDeep(f),
            restField = this.store.getField(field.name);
        throwIf(!restField, `Unknown field '${field.name}' in RestGrid.`);

        if (restField.required) field.rules = [...(field.rules ? field.rules : []), required];

        const inputType = restField.typeField ? this.getDynamicType(restField.typeField) : restField.type;
        if (inputType === 'bool') field.initialValue = withDefault(field.initialValue, false);

        field.readonly = !(restField.editable || (restField.editable === 'onAdd' && this.isAdd));

        return {...field, restField, inputType};
    }

    //-------------------------
    // Helpers
    //-------------------------

    getDynamicType(typeField) {
        const {record, store}  = this.parent,
            field = store.getField(typeField);
        const rawType = record && field ? record[field.name] : null;

        switch (rawType) {
            case 'double':
            case 'int':
            case 'long':
                return 'number';
            default:
                return rawType || 'string';
        }
    }
}