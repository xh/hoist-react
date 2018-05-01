/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist/core';
import {start} from 'hoist/promise';
import {observable, computed, action} from 'hoist/mobx';
import {MessageModel} from 'hoist/cmp';
import {Icon} from 'hoist/icon';
import {isEqual} from 'lodash';

import {RestControlModel} from './RestControlModel';

export class RestFormModel {

    parent = null;
    controlModels = [];
    messageModel = new MessageModel({title: 'Warning', icon: Icon.warning({size: 'lg'})});

    // If not null, form will be open and display it
    @observable record = null;
    originalRecord = null;

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
    get isValid() {
        return this.controlModels.every(it => it.isValid);
    }

    @computed
    get isWritable() {
        const {isAdd, actionEnabled} = this;
        return (isAdd && actionEnabled.add) || (!isAdd && actionEnabled.edit);
    }

    @computed
    get isDirty() {
        return !isEqual(this.record, this.originalRecord);
    }

    constructor({parent, editors}) {
        this.parent = parent;
        this.controlModels = editors.map((editor) => {
            const field = this.store.getField(editor.field);
            if (!field) {
                throw XH.exception(`Unknown field '${editor.field}' in RestGrid.`);
            }
            return new RestControlModel({editor, field, parent: this});
        });
    }

    clearTypeFields(typeField) {
        this.fields.forEach(it => {
            if (it.typeField == typeField) {
                this.setValue(it.name, null);
            }
        });
    }

    //-----------------
    // Actions
    //-----------------
    @action
    saveRecord() {
        const {isAdd, record, store} = this;
        start(() => {
            return isAdd ? store.addRecordAsync(record) : store.saveRecordAsync(record);
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
        this.originalRecord = this.record = null;
        this.messageModel.close();
    }

    @action
    openAdd() {
        const newRec = {id: null};
        this.fields.forEach(f => {
            newRec[f.name] = f.defaultValue;
        });

        this.originalRecord = this.record = newRec;
    }

    @action
    openEdit(rec)  {
        this.originalRecord = this.record = Object.assign({}, rec);
    }

    @action
    setValue = (field, value) => {
        this.record[field] = value;
    }
}