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
import {merge, isNil} from 'lodash';

@HoistModel
export class RestFormModel {

    // Parent RestGridModel
    parent = null;

    // Mutable State
    @observable currentRecord = null;
    @observable readonly = null;
    @observable isAdd = null;
    @observable isOpen = false;

    @managed
    @observable formModel = null;

    @observable types = {};

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

    @action
    openAdd() {
        this.readonly = false;
        this.initForm();
    }

    @action
    openEdit(rec)  {
        this.readonly = false;
        this.initForm(rec);
    }

    @action
    openClone(rec)  {
        this.readonly = false;
        this.initForm(rec);
    }


    @action
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
            const confirmed = await XH.confirm({
                message: warning,
                title: 'Warning',
                icon: Icon.warning({size: 'lg'})
            });
            if (!confirmed) return;
        }

        return this.saveRecordAsync();
    }

    //---------------------
    // Implementation
    //---------------------
    initForm(rec) {
        this.currentRecord = !isNil(rec) ? rec : {id: null};
        this.isAdd = isNil(rec) || isNil(rec.id);
        this.isOpen = true;
        const fields = this.editors.map(editor => this.fieldModelConfig(editor));
        XH.safeDestroy(this.formModel);
        const formModel = this.formModel = new FormModel({
            fields,
            initialValues: rec,
            readonly: this.parent.readonly || this.readonly
        });

        // Compute types. Then monitor form for changes to dynamic types
        this.editors.forEach(e => this.calcType(e.field));
        const dynamicTypeFields = this.store.fields.filter(it => it.typeField);
        dynamicTypeFields.forEach(f => {
            const source = formModel.fields[f.typeField],
                target = formModel.fields[f.name];
            if (source && target) {
                formModel.addReaction({
                    track: () => source.value,
                    run: () => {
                        target.setValue(null);
                        this.calcType(target.name);
                    }
                });
            }
        });
    }

    @action
    saveRecordAsync() {
        const {isAdd, store, formModel, currentRecord} = this,
            dirtyOnly = !isAdd,
            record = {...currentRecord, ...formModel.getData(dirtyOnly)},
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
            readonly: restField.editable === false || (restField.editable === 'onAdd' && !this.isAdd),
            initialValue: restField.defaultValue
        }, editor.fieldModel);
    }

    //-------------------------
    // Helpers
    //-------------------------
    calcType(fieldName) {
        const restField = this.store.getField(fieldName);
        this.types[fieldName] = restField.typeField ? this.getDynamicType(restField.typeField) : restField.type;
    }

    getDynamicType(typeField) {
        // Favor (observable) value in form itself, if present!
        const {currentRecord, store} = this,
            field = store.getField(typeField),
            formField = this.formModel.fields[typeField];
        let rawType = null;
        if (formField) {
            rawType = formField.value;
        } else if (currentRecord && field) {
            rawType = currentRecord[field.name];
        }

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