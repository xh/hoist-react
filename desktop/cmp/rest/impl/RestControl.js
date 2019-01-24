/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React, {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {fmtDateTime} from '@xh/hoist/format';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {
    jsonInput,
    select,
    numberInput,
    switchInput,
    checkbox,
    textArea,
    textInput
} from '@xh/hoist/desktop/cmp/input';

import {RestControlModel} from './RestControlModel';

import {isNil} from 'lodash';

@HoistComponent
export class RestControl extends Component {

    static modelClass = RestControlModel;

    render() {
        // if (this.isBlankMetaData()) return null;
        const {name, disabled, readonly} = this.props;
        return formField({
            readonly,
            field: name,
            disabled,
            item: this.renderFormField()
        })
    }

    renderFormField() {
        const {restField, inputType, inputRenderer} = this.props;
        if (inputType == null) {
            return null;
        } else if (restField.lookup) {
            return this.renderSelect();
        } else if (inputRenderer) {
            //TODO: handle custom input component
        } else {
            return this.renderInputFromType()
        }
    }

    renderInputFromType() {
        const {inputType, restField} = this.props;
        
        switch(inputType) {
            case 'bool':
                return restField.required ? this.renderSwitch() : this.renderCheckbox();
            case 'number':
                return this.renderNumberField();
            case 'json':
                return this.renderJsonField();
            case 'textarea':
                return this.renderTextArea();
            // case 'date':
            //     return this.renderDatePicker();
            default:
                return this.renderTextField();
        }
    }



    renderSelect() {
        const {inputType, restField} = this.props;

        let options;
        if (restField.lookup) {
            options = [...restField.lookup];
        } else if (inputType === 'bool') {
            options = [true, false];
        } else {
            options = [];
        }

        return select({
            options,
            enableCreate: restField.enableCreate
        });
    }

    renderSwitch() {
        return switchInput();
    }

    renderCheckbox() {
        return checkbox();
    }

    renderNumberField() {
        return numberInput({
            commitOnChange: true
        });
    }

    renderTextArea() {
        return textArea({
            autoFocus: this.props.autoFocus,
            style: {height: this.props.height || 100},
            disabled: !model.isEditable,
            spellCheck: model.editor.spellCheck,
            commitOnChange: true
        });
    }

    renderTextField() {
        const {props, inputType} = this,
            {autoFocus, spellCheck} = props,
            type = inputType === 'pwd' ? 'password' : 'text';
        return textInput({
            type,
            autoFocus,
            spellCheck,
            commitOnChange: true
        });
    }

    renderJsonField() {
        return jsonInput({
            // setting size appears to be the only way to get scrollbars
            // width: 343,
            height: this.props.height || 150,
            commitOnChange: true
        });
    }

    //------------------------
    // Implementation
    //------------------------

    isBlankMetaData() {
        const model = this.model;
        return !model.value && ['lastUpdatedBy', 'lastUpdated'].includes(model.field.name);
    }

}
export const restControl = elemFactory(RestControl);

