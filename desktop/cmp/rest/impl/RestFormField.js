/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {
    jsonInput,
    select,
    numberInput,
    switchInput,
    textInput,
    dateInput
} from '@xh/hoist/desktop/cmp/input';

import {RestFormModel} from './RestFormModel';

import {assign} from 'lodash';
import {formField} from '@xh/hoist/desktop/cmp/form';

@HoistComponent
export class RestFormField extends Component {

    static modelClass = RestFormModel;

    render() {
        const {editor} = this.props,
            name = editor.field;

        if (this.isBlankMetaData(name)) return null;

        let config = assign({field: name, flex: 1}, editor.formField);

        if (!config.item && !config.items) {
            config = {item: this.renderDefaultInput(name), ...config};
        }

        return formField(config);
    }

    renderDefaultInput() {
        const {model} = this,
            name = this.props.editor.field,
            type = model.types[name],
            storeField = model.store.getField(name),
            fieldModel = model.formModel.fields[name];
        
        if (storeField.lookup) {
            return this.renderSelect({
                options: [...storeField.lookup],
                enableClear: !fieldModel.isRequired,
                enableCreate: storeField.enableCreate
            });
        }

        switch (type) {
            case 'bool':
                return this.renderBoolean(fieldModel);
            case 'number':
                return numberInput();
            case 'json':
                return jsonInput();
            case 'date':
                return dateInput();
            default:
                return textInput();
        }
    }

    renderBoolean(fieldModel) {
        return fieldModel.isRequired && fieldModel.value != null ?
            switchInput() :
            this.renderSelect({
                options: [true, false],
                enableClear: !fieldModel.isRequired,
                enableCreate: false
            });
    }

    renderSelect(args) {
        return select({...args});
    }

    isBlankMetaData(name) {
        const {formModel} = this.model;
        return !formModel.values[name] && ['lastUpdatedBy', 'lastUpdated'].includes(name);
    }
}
export const restFormField = elemFactory(RestFormField);

