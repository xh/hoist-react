/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {forOwn} from 'lodash';
import {start} from 'hoist/promise';
import {observable, computed, action} from 'hoist/mobx';
import {MessageModel} from 'hoist/cmp';

export class RestFormModel {

    parent = null;
    editors = [];
    messageModel = new MessageModel({title: 'Warning', icon: 'warning-sign'});

    // If not null, form will be open and display it
    @observable record = null;

    get actionWarning() {return this.parent.actionWarning}
    get actionEnabled() {return this.parent.actionEnabled}
    get store()         {return this.parent.store}
    get fields()        {return this.store.fields}
    get loadModel()     {return this.store.loadModel}

    @computed
    get isAdd() {
        const rec = this.record;
        return (rec && rec.id === null);
    }

    @computed
    get isFormValid() {
        return this.fields.every(f => this.isFieldValid(f.name));
    }

    isFieldValid(fieldName) {
        const {record, fields} = this;
        if (!record) return false;
        const field = fields.find(it => it.name === fieldName),
            v = record[fieldName];
        return field.allowNull || (v != null && v !== '');
    }

    @computed
    get isWritable() {
        const {isAdd, actionEnabled} = this;
        return (isAdd && actionEnabled.add) || (!isAdd && actionEnabled.edit);
    }

    constructor({parent, editors}) {
        this.parent = parent;
        this.editors = editors;
    }

    //-----------------
    // Actions
    //-----------------
    @action
    saveRecord() {
        const {isAdd, record, store} = this;
        start(() => {
            return isAdd ? store.addRecordAsync(record) : store.saveRecordAsync(record)
        }).then(
            () => this.close()
        ).catchDefault();
    }

    @action
    deleteRecord() {
        this.store
            .deleteRecordAsync(this.record)
            .then(() => this.close())
            .catchDefault();
    }

    @action
    close() {
        this.record = null;
        this.messageModel.close();
    }

    @action
    openAdd() {
        const newRec = {id: null};
        // must start with all keys in place, so all values will observable
        this.fields.forEach(spec => {
            newRec[spec.name] = spec.defaultValue;
        });

        this.record = newRec;
    }

    @action
    openEdit(rec)  {
        this.record = Object.assign({}, rec);
    }

    @action
    setValue = (field, value) => {
        this.record[field] = value;
    }

    //---------------------------------
    // Helpers for Form/Editor Creation
    //---------------------------------
    /**
     * Return a bundle of props for each control in the form.
     * These contain toolkit independent metadata, and access to the underlying value/model.
     */
    getInputProps() {
        const fields = this.fields,
            isAdd = this.isAdd,
            record = this.record;

        return this.editors.map(editor => {
            const fieldSpec = fields.find(it => it.name === editor.field),
                fieldName = fieldSpec.name,
                disabled = fieldSpec.readOnly || (editor.additionsOnly && !isAdd),
                type = this.getInputType(editor, fieldSpec);

            // NOTE: We provide the value setter and *getter* for convenience -- but don't dereference.
            // It's observable and volatile, and we only want controls using it to re-render
            return {
                editor,
                type,
                fieldSpec,
                fieldName,
                get value() {return record[fieldName]},
                disabled,
                model: this
            };
        });
    }

    getInputType(editor, fieldSpec) {
        const fieldType = fieldSpec.typeField ? this.getTypeFromRecord(fieldSpec) : fieldSpec.type,
            editorType = editor.type;

        if (editorType === 'displayField') {
            return 'display';
        }
        if (fieldSpec.lookupValues) {
            return 'dropdown';
        }
        if (fieldType === 'bool') {
            return 'boolean';
        }
        if (fieldType === 'int') {
            return 'number';
        }
        if (editorType === 'textarea' || fieldType === 'json') {
            return 'textarea';
        }
        return 'text';
    }

    // For dynamic types.
    getTypeFromRecord(fieldSpec) {
        const typeField = this.fields.find(it => it.name === fieldSpec.typeField);

        return this.record[typeField.name];
    }
}