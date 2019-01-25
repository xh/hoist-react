/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {
    jsonInput,
    select,
    numberInput,
    switchInput,
    checkbox,
    textArea,
    textInput,
    dateInput
} from '@xh/hoist/desktop/cmp/input';

import {RestControlModel} from './RestControlModel';

@HoistComponent
export class RestControl extends Component {

    static modelClass = RestControlModel;

    render() {
        // if (this.isBlankMetaData()) return null;
        const {name, readonly, omit, fieldOptions} = this.props;
        return formField({
            field: name,
            item: this.renderFormField(),
            readonly,
            disabled: true,
            omit,
            ...fieldOptions
        });
    }

    renderFormField() {
        const {restField, inputType, renderer} = this.props;
        if (inputType == null) {
            return null;
        } else if (restField.lookup) {
            return this.renderSelect();
        } else if (renderer) {
            return renderer;
        } else {
            return this.renderInputFromType();
        }
    }

    renderInputFromType() {
        const {inputType, restField} = this.props;
        
        switch (inputType) {
            case 'bool':
                return restField.required ? switchInput() : checkbox();
            case 'number':
                return numberInput();
            case 'json':
                return jsonInput({height: 150});
            case 'textarea':
                return textArea();
            case 'date':
                return dateInput({placeholder: 'yyyy-mm-dd'});
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

    renderTextField() {
        const {inputType} = this.props,
            type = inputType === 'pwd' ? 'password' : 'text';
        return textInput({type});
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

