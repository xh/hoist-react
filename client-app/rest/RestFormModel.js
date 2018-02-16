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
    //---------------
    parent = null;
    editors = [];
    confirmModel = new ConfirmModel();

    // If not null, form will be open and display it
    @observable record = null;

    get actionWarning() {return this.parent.actionWarning}
    get actionEnabled() {return this.parent.actionEnabled}

    @computed
    get isAdd() {
        const rec = this.record;
        return (rec && rec.id === null);
    }

    @computed
    get isValid() {
        const fieldSpecs = this.parent.recordSpec.fields;
        let valid = true;
        forOwn(this.record, (v, k) => {
            const spec = fieldSpecs.find(it => it.name === k);
            if (spec && !spec.allowNull && (v == null || v === '')) valid = false;
        });
        return valid;
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
        this.parent.saveRecord(this.record);
    }

    @action
    deleteRecord() {
        this.parent.deleteRecord(this.record);
    }

    @action
    close() {
        this.record = null;
    }

    @action
    openAdd() {
        const newRec = {id: null},
            fieldSpecs = this.parent.recordSpec.fields;

        // must start with fully formed dummy rec for validation purposes
        // a computed property (isValid) won't re-run if none of the data used in the previous computation changed.
        fieldSpecs.forEach(spec => {
            newRec[spec.name] = null;
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
    getInputConfigs() {
        return this.editors.map(editor => {
            const {recordSpec} = this.parent,
                fields = recordSpec.fields,
                fieldSpec = fields.find(it => it.name === editor.field),
                defaultValue = this.isAdd ? '' : this.record[fieldSpec.name],
                isDisabled = fieldSpec.readOnly || (editor.additionsOnly && !this.isAdd);

            return {
                editor: editor,
                fieldSpec: fieldSpec,
                field: fieldSpec.name,
                defaultValue: defaultValue == null ? '' : defaultValue,
                type: this.getInputType(editor, fieldSpec),
                isDisabled: isDisabled
            };
        });
    }

    getInputType(editor, fieldSpec) {
        if (fieldSpec.typeField) fieldSpec.type = this.getTypeFromTypeField(fieldSpec);
        if (editor.type === 'displayField') return 'display';
        if (fieldSpec.lookupValues) return 'dropdown';
        if (fieldSpec.type === 'bool' || fieldSpec.type === 'boolean') return 'boolean';
        if (fieldSpec.type === 'int') return 'number';
        if (editor.type === 'textarea' || fieldSpec.type === 'json') return 'textarea';
        return 'text';
    }

    getTypeFromTypeField(fieldSpec) {
        const {recordSpec} = this.parent,
            fields = recordSpec.fields;
        return this.record[fields.find(it => it.name === fieldSpec.typeField).name];
    }
}