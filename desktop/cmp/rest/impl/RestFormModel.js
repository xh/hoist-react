/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from '@xh/hoist/core';
import {start} from '@xh/hoist/promise';
import {observable, computed, action, bindable} from '@xh/hoist/mobx';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {isEqual, cloneDeep} from 'lodash';
import {dateIs, FormModel, lengthIs, numberIs, required} from '@xh/hoist/cmp/form';

@HoistModel
export class RestFormModel {

    /** @member {RestGridModel} */
    parent = null;

    /** @member {Object} */
    fieldDefaults = null;

    /** @member {RecordAction[]} */
    actions;

    currentRecord = null;

    readonly;
    @observable formModel = null;
    formFields = null;

    @bindable isOpen = false;
    @bindable isAdd = null;

    get actionWarning() {return this.parent.actionWarning}
    get store()          {return this.parent.store}
    get loadModel()      {return this.store.loadModel}

    @computed
    get isDirty() {
        return !isEqual(this.record, this.originalRecord);
    }

    constructor({parent, formFields, actions, fieldDefaults}) {
        this.parent = parent;
        this.formFields = formFields.map(f => this.createFormField(f));
        this.formModel = new FormModel({
            parent,
            fields: this.formFields,
            readonly: this.readonly
        });

        this.fieldDefaults = fieldDefaults;
        this.actions = actions;
    }



    //-----------------
    // Actions
    //-----------------
    @action
    saveRecord() {
        throwIf(this.parent.readonly, 'Record not saved: this grid is read-only.');
        const {isAdd, store, formModel, currentRecord} = this,
            record = {...currentRecord, ...(formModel.getData())};

        start(() => {
            return isAdd ? store.addRecordAsync(record) : store.saveRecordAsync(record);
        }).then(
            () => this.close()
        ).catchDefault();
    }

    @action
    close() {
        this.formModel.reset()
        console.log(this.formModel)
        this.setIsOpen(false)
    }

    @action
    openAdd() {
        console.log(this.formModel.getData())
        this.currentRecord = {id: null};
        this.formModel.init();
        this.readonly = false; // needed?
        this.setIsOpen(true);
        this.setIsAdd(true);
    }

    @action
    openEdit(rec)  {
        this.currentRecord = rec;
        this.formModel.init(rec);
        this.readonly = false;
        this.setIsOpen(true);
        this.setIsAdd(false);
    }

    @action
    openView(rec) {
        this.formModel.init(rec);
        this.readonly = true;
        this.setIsAdd(false);
    }

    destroy() {
        XH.safeDestroy(this.formModel)
    }

    //---------------------
    // Implementation
    //---------------------

    createFormField(f) {
        const field = cloneDeep(f),
            restField = this.store.getField(field.name);
        throwIf(!restField, `Unknown field '${field.name}' in RestGrid.`);

        if (restField.required) field.rules = [...(field.rules ? field.rules : []), required];

        const inputType = restField.typeField ? this.getDynamicType(restField.typeField) : restField.type;

        if (inputType === 'bool') field.initialValue = withDefault(field.initialValue, false);

        field.readonly = !(restField.editable || (restField.editable === 'onAdd' && this.isAdd));
        // field.omit = field.readonly && this.currentRecord && !this.currentRecord[field.name];

        return {...field, restField, inputType};
    }

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