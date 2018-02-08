/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist';
import {vbox} from 'hoist/layout';
import {observer} from 'hoist/mobx';
import {
    dropdown,
    hoistButton,
    input,
    label,
    modal,
    modalContent,
    modalActions,
    modalHeader,
    textArea
} from 'hoist/kit/semantic';

@observer
export class RestFormSemantic extends Component {

    render() {
        const {formRecord, formIsAdd} = this.model;

        if (!formRecord) return null;

        return modal({
            open: true,
            onClose: this.onClose,
            closeIcon: true,
            size: 'small',
            items: [
                modalHeader(formIsAdd ? 'Add Record' : 'Edit Record'),
                modalContent(this.getForm()),
                modalActions(this.getButtons())
            ]
        });
    }

    //--------------------------
    // Implementation
    //---------------------------
    get model() {return this.props.model}

    getForm() {
        const {editors, recordSpec, formRecord} = this.model,
            fields = recordSpec.fields,
            valueType = formRecord.valueType,
            items = [];

        editors.forEach(editor => {
            const fieldSpec = fields.find(it => it.name === editor.field);
            if (fieldSpec.typeField) fieldSpec.type = valueType;

            const inputConfig = this.getInputConfig(fieldSpec, editor, formRecord),
                inputType = this.getInputType(fieldSpec, editor);

            items.push(this.createFieldLabel(fieldSpec));
            switch (inputType) {
                case 'dropdown':
                    items.push(this.createDropdown(inputConfig));
                    break;
                case 'boolean':
                    items.push(this.createBooleanDropdown(inputConfig));
                    break;
                case 'number':
                    items.push(this.createNumberInput(inputConfig));
                    break;
                case 'textarea':
                    items.push(this.createTextAreaInput(inputConfig));
                    break;
                case 'text':
                    items.push(this.createTextInput(inputConfig));
                    break;
                default:
                    items.push(this.createTextInput(inputConfig));
            }
        });

        return vbox({
            cls: 'rest-form',
            padding: 10,
            items
        });
    }

    getButtons() {
        const {formIsValid, formIsWritable, enableDelete, formIsAdd} = this.model;
        return [
            hoistButton({
                content: 'Delete',
                icon: {name: 'x', color: 'red'},
                disabled: !formIsValid,
                onClick: this.onDeleteClick,
                omit: !enableDelete || formIsAdd
            }),
            hoistButton({
                content: 'Save',
                icon: {name: 'check', color: 'green'},
                disabled: !formIsValid,
                onClick: this.onSaveClick,
                omit: !formIsWritable
            })
        ];
    }

    onClose = () => {
        this.model.closeForm();
    }

    onDeleteClick = () => {
        const model = this.model;
        model.deleteRecord(model.formRecord);
    }

    onSaveClick = () => {
        const model = this.model;
        model.saveFormRecord();
    }

    createFieldLabel(fieldSpec) {
        const content = fieldSpec.label || fieldSpec.name;
        return label({content: content, style: {width: '115px', textAlign: 'center', paddingBottom: 5}});
    }

    createDropdown(config) {
        const options = config.fieldSpec.lookupValues.map(v => {
                return {text: v, value: v, key: v};
            }),
            allowAdditions = config.editor.allowAdditions;

        return dropdown({
            className: 'rest-form-dropdown',
            style: {marginBottom: 5},
            fluid: true,
            options: options,
            defaultValue: config.defaultValue,
            allowAdditions: allowAdditions, // much simpler in here in semantic, see note in blueprint
            onChange: this.onInputChange, // gets all props on item, makes handler simpler than in blueprint
            onAddItem: this.onAddItemToDropDown,
            search: true,
            selection: true,
            disabled: config.isDisabled,
            field: config.field,
            model: this.model
        });
    }

    createBooleanDropdown(config) {
        const options = [{text: 'True', value: 'true', key: 'True'}, {text: 'False', value: 'false', key: 'False'}];

        return dropdown({
            className: 'rest-form-dropdown',
            style: {marginBottom: 5},
            fluid: true,
            options: options,
            defaultValue: config.defaultValue != null ? config.defaultValue.toString() : '',
            onChange: this.onBoolChange,
            disabled: config.isDisabled,
            field: config.field,
            model: this.model
        });
    }

    createNumberInput(config) {
        return input({
            style: {marginBottom: 5},
            defaultValue: config.defaultValue || '',
            onChange: this.onInputChange,
            type: 'number',
            disabled: config.isDisabled,
            field: config.field,
            model: this.model
        });
    }

    createTextAreaInput(config) {
        return textArea({
            style: {marginBottom: 5},
            defaultValue: config.defaultValue || '',
            onChange: this.onInputChange,
            disabled: config.isDisabled,
            field: config.field,
            model: this.model
        });
    }

    createTextInput(config) {
        return input({
            style: {marginBottom: 5},
            defaultValue: config.defaultValue || '',
            onChange: this.onInputChange,
            type: 'text',
            disabled: config.isDisabled,
            field: config.field,
            model: this.model
        });
    }

    onAddItemToDropDown(e, data) {
        data.options.push({text: data.value, value: data.value, key: data.value});
    }

    onInputChange(e, data) {
        const {setFormValue} = data.model,
            field = data.field,
            value = data.value;

        setFormValue(field, value);
    }

    onBoolChange(e, data) {
        const {setFormValue} = data.model,
            field = data.field,
            value = data.value;

        setFormValue(field, value === 'true');
    }

    getInputConfig(fieldSpec, editor, formRecord) {
        const renderer = editor.renderer,
            currentValue = formRecord[fieldSpec.name],
            defaultValue = renderer ? renderer(currentValue) : currentValue,
            isDisabled = fieldSpec.readOnly || (editor.additionsOnly && !this.model.formIsAdd);
        return {
            editor: editor,
            fieldSpec: fieldSpec,
            field: fieldSpec.name,
            defaultValue: defaultValue,
            isDisabled: isDisabled
        };
    }

    getInputType(fieldSpec, editor) {
        if (fieldSpec.lookupValues) return 'dropdown';
        if (fieldSpec.type === 'bool' || fieldSpec.type === 'boolean') return 'boolean';
        if (fieldSpec.type === 'int') return 'number';
        if (editor.type === 'textarea' || fieldSpec.type === 'json') return 'textarea';
        return 'text';
    }
}
export const restFormSemantic = elemFactory(RestFormSemantic);