/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {computed} from '@xh/hoist/mobx';
import {isJSON} from '@xh/hoist/utils/js';

@HoistModel
export class RestControlModel  {

    /** @member {RestFormModel} */
    parent;

    field;
    editor;

    get record() {return this.parent.record}

    constructor({field, editor, parent}) {
        this.field = field;
        this.editor = editor;
        this.parent = parent;
        if (field.typeField) {
            this.addReaction({
                track: () => this.type,
                run: () => {
                    if (this.parent.isDirty) {
                        const defVal = this.type === 'bool' ? false : null;
                        this.setValue(defVal);
                    }
                }
            });
        }
    }

    @computed
    get value()  {
        const {record, field, parseString} = this;
        return record ? parseString(record[field.name]) : null;
    }

    setValue(value) {
        const {record, field} = this;
        if (record) {
            this.parent.setValue(field.name, value);
        }
    }

    @computed
    get isValid() {
        const {field, value} = this,
            hasValue = (value != null && value !== '');
        if (hasValue && this.type == 'json') {
            return isJSON(value);
        }
        return hasValue || !field.required;
    }

    @computed
    get isEditable() {
        const {parent, field} = this;
        return parent.isWritable && (field.editable === true || (field.editable === 'onAdd' && parent.isAdd));
    }

    @computed
    get type() {
        const {field} = this;
        return field.typeField ? this.getDynamicType(field.typeField) : field.type;
    }

    //---------------------
    // Implementation
    //---------------------
    getDynamicType(typeFieldName) {
        const {record, store}  = this.parent,
            field = store.getField(typeFieldName);
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

    parseString = (val) => {
        if (!this.field.typeField) return val;
        if (this.type === 'bool') {
            switch(val) {
                case 'true':    return true;
                case 'false':   return false;
                default:        return val;
            }
        } else if (!isNaN(Number(val))) {
            return Number(val);
        } else {
            return val;
        }
    }
}