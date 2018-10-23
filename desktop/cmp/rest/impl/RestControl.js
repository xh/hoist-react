/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React, {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {controlGroup} from '@xh/hoist/kit/blueprint';
import {fmtDateTime} from '@xh/hoist/format';
import {hbox} from '@xh/hoist/cmp/layout';
import {
    jsonInput,
    label,
    select,
    numberInput,
    switchInput,
    checkbox,
    textArea,
    textInput
} from '@xh/hoist/desktop/cmp/form';
import {isNil} from 'lodash';

@HoistComponent
export class RestControl extends Component {

    render() {
        if (this.isBlankMetaData()) return null;

        return hbox({
            className: 'xh-rest-form__control',
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

        if (type === 'json') {
            return this.renderJsonField();
        }

        if (!isEditable) return this.renderDisplayField();
        
        if (field.lookup) {
            return this.renderSelect();
        } else if (type === 'bool') {
            // Boolean controls will intelligently default based on nullability, unless editor type is otherwise specified
            if (editorType === 'boolSelect') return this.renderSelect();
            if (editorType === 'boolCheck') return this.renderCheckbox();
            if (editorType === 'boolSwitch') return this.renderSwitch();
            return field.required ? this.renderSwitch() : this.renderSelect();
        } else if (type === 'number') {
            return this.renderNumberField();
        } else {
            return editorType === 'textarea' ? this.renderTextArea() : this.renderTextField();
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

        return label(!isNil(value) ? value.toString() : null);
    }

    renderSelect() {
        const model = this.model,
            field = model.field,
            type = model.type;

        let options;
        if (field.lookup) {
            options = field.lookup;
        } else if (type == 'bool') {
            options = [true, false];
        } else {
            options = [];
        }

        // TODO - we should be able to let the user simply clear the field.
        if (!field.required) options.unshift(null);

        return select({
            model,
            field: 'value',
            options,
            enableCreate: field.enableCreate,
            disabled: !model.isEditable
        });
    }

    renderCheckbox() {
        const model = this.model;
        return checkbox({
            model,
            field: 'value',
            disabled: !model.isEditable
        });
    }

    renderSwitch() {
        const model = this.model;
        return switchInput({
            model,
            field: 'value',
            disabled: !model.isEditable
        });
    }

    renderNumberField() {
        const model = this.model;
        return numberInput({
            model,
            field: 'value',
            className: 'bp3-fill',
            disabled: !model.isEditable,
            commitOnChange: true
        });
    }

    renderTextArea() {
        const model = this.model;
        return textArea({
            model,
            field: 'value',
            autoFocus: this.props.autoFocus,
            className: 'bp3-fill',
            style: {height: model.editor.height || 100},
            disabled: !model.isEditable,
            spellCheck: model.editor.spellCheck,
            commitOnChange: true
        });
    }

    renderTextField() {
        const model = this.model,
            type = model.type === 'pwd' ? 'password' : 'text';
        return textInput({
            model,
            type,
            field: 'value',
            autoFocus: this.props.autoFocus,
            className: 'bp3-fill',
            disabled: !model.isEditable,
            spellCheck: model.editor.spellCheck,
            commitOnChange: true
        });
    }

    renderJsonField() {
        const model = this.model;
        return jsonInput({
            model,
            field: 'value',
            className: 'bp3-fill',
            disabled: !model.isEditable,
            // setting size appears to be the only way to get scrollbars
            width: 343,
            height: model.editor.height || 150,
            commitOnChange: true
        });
    }

    isBlankMetaData() {
        const model = this.model;
        return !model.value && ['lastUpdatedBy', 'lastUpdated'].includes(model.field.name);
    }
}
export const restControl = elemFactory(RestControl);

