/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React, {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {fmtDateTime} from 'hoist/format';
import {hbox} from 'hoist/layout';
import {controlGroup} from 'hoist/kit/blueprint';
import {label, comboField, numberField, selectField, textAreaField, textField}  from 'hoist/cmp';

@hoistComponent()
export class RestControl extends Component {

    render() {
        return hbox({
            cls: 'xh-mb',
            items: [
                this.renderLabel(),
                //  Needed to stretch control, and also avoid focus clipping?
                controlGroup({
                    fill: true,
                    style: {flex: 1, margin: 1},
                    item: this.renderControl()
                })
            ]
        });
    }

    renderControl() {
        const {field, editor, type, isEditable} = this.model,
            editorType = editor.type;

        if (type == null) return null;

        if (type === 'json' || editorType === 'textarea') {
            return this.renderTextArea();
        }

        if (!isEditable) return this.renderDisplayField();
        
        if (field.lookup) {
            return field.lookupStrict ? this.renderSelect() : this.renderCombo();
        } else if (type === 'bool') {
            return this.renderSelect();
        } else if (type === 'number') {
            return this.renderNumberField();
        } else {
            return this.renderTextField();
        }
    }

    renderLabel() {
        const lbl = this.model.field.label,
            isValid = this.model.isValid,
            item = <span>{lbl} <span style={{color: 'red'}}>{!isValid ? '*' : ''}</span> </span>;

        return label({item, width: 115});
    }

    renderDisplayField() {
        let {value, type} = this.model;
        if (type === 'date') {
            value = value ? fmtDateTime(value) : '';
        }
        return label(value);
    }

    renderCombo() {
        const model = this.model,
            lookup = model.field.lookup;

        const options = [null, ...lookup];
        return comboField({
            model,
            field: 'value',
            options,
            disabled: !model.isEditable
        });
    }

    renderSelect() {
        const model = this.model,
            lookup = model.field.lookup,
            type = model.type;

        let options;
        if (lookup) {
            options = [null, ...lookup];
        } else if (type == 'bool') {
            options = [null, true, false];
        } else {
            options = [null];
        }

        return selectField({
            model,
            field: 'value',
            options,
            disabled: !model.isEditable
        });
    }

    renderNumberField() {
        const model = this.model;
        return numberField({
            model,
            field: 'value',
            cls: 'pt-fill',
            disabled: !model.isEditable
        });
    }

    renderTextArea() {
        const model = this.model;
        return textAreaField({
            model,
            field: 'value',
            cls: 'pt-fill',
            disabled: !model.isEditable
        });
    }

    renderTextField() {
        const model = this.model;
        return textField({
            model,
            field: 'value',
            cls: 'pt-fill',
            disabled: !model.isEditable
        });
    }
}
export const restControl = elemFactory(RestControl);

