/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {FormModel, required} from '@xh/hoist/cmp/form';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {action, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isFunction, isNil, merge} from 'lodash';

@HoistModel
export class RestFormModel {

    /** @member {RestGridModel} */
    parent = null;

    // Mutable State
    @observable.ref currentRecord = null;
    @observable readonly = null;
    @observable isAdd = null;
    @observable isOpen = false;

    /** @member {FormModel} */
    @managed
    @observable
    formModel;

    @observable types = {};

    get actionWarning()     {return this.parent.actionWarning}
    get actions()           {return this.parent.formActions}
    get editors()           {return this.parent.editors}
    get gridModel()         {return this.parent.gridModel}
    get store()             {return this.parent.store}
    get loadModel()         {return this.store.loadModel}

    /** @param {RestGridModel} parent */
    constructor(parent) {
        this.parent = parent;
    }

    /**
     * @param {String} field
     * @return {RestField}
     */
    getStoreField(field) {return this.store.getField(field)}

    /**
     * @param {String} field
     * @return {FieldModel}
     */
    getFormFieldModel(field) {return this.formModel.getField(field)}


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
    openClone(data)  {
        this.readonly = false;
        this.initForm({data});
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
            XH.toast({message: 'Form not valid. Please correct errors.'});
            return;
        }

        if (warning) {
            const message = isFunction(warning) ? warning([this.currentRecord]) : warning,
                confirmed = await XH.confirm({
                    message,
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
            initialValues: rec?.data,
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
    async saveRecordAsync() {
        const {isAdd, store, formModel, currentRecord} = this,
            record = {id: currentRecord.id, data: formModel.getData(!isAdd)},
            saveFn = () => isAdd ? store.addRecordAsync(record) : store.saveRecordAsync(record);

        return saveFn()
            .then(() => this.close())
            .linkTo(this.loadModel)
            .catchDefault();
    }

    fieldModelConfig(editor) {
        const name = editor.field,
            restField = this.getStoreField(name);
        throwIf(!restField, `Unknown field '${name}' in RestGrid.`);

        return merge({
            name,
            rules: restField.required ? [required] : [],
            displayName: restField.displayName,
            readonly: restField.editable === false || (restField.editable === 'onAdd' && !this.isAdd),
            initialValue: restField.defaultValue
        }, editor.fieldModel);
    }

    //-------------------------
    // Helpers
    //-------------------------
    calcType(fieldName) {
        const restField = this.getStoreField(fieldName);
        this.types[fieldName] = restField.typeField ? this.getDynamicType(restField.typeField) : restField.type;
    }

    getDynamicType(typeField) {
        // Favor (observable) value in form itself, if present!
        const {currentRecord, formModel} = this,
            field = this.getStoreField(typeField),
            formField = formModel.fields[typeField];

        let rawType = null;
        if (formField) {
            rawType = formField.value;
        } else if (currentRecord?.data && field) {
            rawType = currentRecord.data[field.name];
        }

        switch (rawType) {
            case 'double':
            case 'int':
            case 'long':
                return 'number';
            default:
                return rawType ?? 'string';
        }
    }
}
