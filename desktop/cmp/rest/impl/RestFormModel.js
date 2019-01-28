/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel, managed} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {FormModel, required} from '@xh/hoist/cmp/form';
import {Icon} from '@xh/hoist/icon';
import {merge} from 'lodash';

@HoistModel
export class RestFormModel {

    // Parent RestGridModel
    parent = null;

    // Mutable State
    currentRecord = null;
    readonly = null;
    isAdd = null;

    @observable isOpen = false;

    @managed
    formModel = null;

    get actionWarning()     {return this.parent.actionWarning}
    get actions()           {return this.parent.formActions}
    get editors()           {return this.parent.editors}
    get store()             {return this.parent.store}
    get loadModel()         {return this.store.loadModel}

    constructor(parent) {
        this.parent = parent;
    }

    //-----------------
    // Actions
    //-----------------
    @action
    close() {
        this.isOpen = false;
        XH.safeDestroy(this.formModel);
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

    async validateAndSaveAsync() {
        throwIf(this.parent.readonly, 'Record not saved: this grid is read-only.');
        const warning = this.actionWarning[this.isAdd ? 'add' : 'edit'];

        const valid = await this.formModel.validateAsync();
        if (!valid) {
            XH.toast({message: 'Form not valid.  Please correct errors.'});
            return;
        }

        if (warning) {
            await XH.confirm({
                message: warning,
                title: 'Warning',
                icon: Icon.warning({size: 'lg'})
            });
        }

        return this.saveRecordAsync();
    }

    //---------------------
    // Implementation
    //---------------------
    @action
    initForm(rec) {
        this.currentRecord = rec ? rec : {id: null};

        const fields = this.editors.map(editor => this.fieldModelConfig(editor));

        this.formModel = new FormModel({
            fields,
            initialValues: rec,
            readonly: this.parent.readonly || this.readonly
        });

        this.isAdd = !rec;
        this.isOpen = true;
    }

    @action
    saveRecordAsync() {
        const {isAdd, store, formModel, currentRecord} = this,
            record = {...currentRecord, ...formModel.getData(true)},
            saveFn = () => isAdd ? store.addRecordAsync(record) : store.saveRecordAsync(record);
        return saveFn()
            .then(() => this.close())
            .linkTo(this.loadModel)
            .catchDefault();
    }

    fieldModelConfig(editor) {
        const name = editor.field,
            restField = this.store.getField(name);
        throwIf(!restField, `Unknown field '${name}' in RestGrid.`);

        return merge({
            name,
            rules: restField.required ? [required] : [],
            displayName: editor.label,
            readonly: !(restField.editable || (restField.editable === 'onAdd' && this.isAdd))
        }, editor.fieldModel);

    }

    //-------------------------
    // Helpers
    //-------------------------
    getType(name) {
        const restField = this.store.getField(name);
        return restField.typeField ? this.getDynamicType(restField.typeField) : restField.type;
    }

    getDynamicType(typeField) {
        const {record, store} = this.parent,
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