/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist';
import {vbox, div, filler} from 'hoist/layout';
import {observer} from 'hoist/mobx';
import {Classes, button, dialog, inputGroup, label, menuItem, numericInput, select, suggest, textArea} from 'hoist/kit/blueprint';

@observer
export class RestFormBlueprint extends Component {

    render() {
        const {formRecord, formIsAdd} = this.model;
        if (!formRecord) return null;

        return dialog({
            iconName: 'inbox',
            isOpen: true,
            isCloseButtonShown: false,
            title: formIsAdd ? 'Add Record' : 'Edit Record',
            items: [
                div({
                    cls: 'pt-dialog-body',
                    item: this.getForm()
                }),
                div({
                    cls: 'pt-dialog-footer',
                    item: div({
                        cls: 'pt-dialog-footer-actions',
                        items: this.getButtons()
                    })
                })
            ]
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
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
            width: 400,
            padding: 10,
            items
        });
    }

    getButtons() {
        const {formIsValid, formIsWritable, enableDelete, formIsAdd} = this.model;

        return [
            button({
                text: 'Close',
                iconName: 'cross',
                onClick: this.onClose
            }),
            filler(),
            button({
                text: 'Delete',
                iconName: 'cross',
                disabled: !formIsValid,
                onClick: this.onDeleteClick,
                omit: !enableDelete || formIsAdd
            }),
            button({
                text: 'Save',
                iconName: 'tick',
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
        const text = fieldSpec.label || fieldSpec.name;
        return label({text: text, style: {width: '115px', paddingBottom: 5}});
    }

    // need a icon, not obviously a dropdown in GUI
    createDropdown(config) {
        const options = config.fieldSpec.lookupValues;

        // 'hack' to allow additions(not built in), overrides itemPredicate
        const itemListPredicate = config.editor.allowAdditions ? (q, v, index) => {
            if (q && !v.includes(q)) v.push(q);
            const ret = v.filter(it => it.includes(q));
            return q ? ret : v;
        } : null;

        return suggest({
            className: 'rest-form-dropdown-blueprint',
            popoverProps: {popoverClassName: Classes.MINIMAL},
            itemListPredicate: itemListPredicate,
            itemPredicate: (q, v, index) => !v || v.includes(q),
            style: {marginBottom: 5},
            $items: options,
            onItemSelect: this.onDropDownChange,
            itemRenderer: ({handleClick, isActive, item}) => {
                return menuItem({key: item, onClick: handleClick, text: item, className: `xhField-${config.field}`, disabled: config.isDisabled});
            },
            inputValueRenderer: s => s,
            inputProps: {defaultValue: config.defaultValue, value: undefined}, // console warning dictated this undefined if I want to use default val, need to somehow set on visible component
            disabled: config.isDisabled  // must disable both the field and the menu items
        });
    }

    createBooleanDropdown(config) {
        const currentText = config.defaultValue.toString();

        return select({
            className: 'rest-form-dropdown-blueprint',
            class: 'pt-fill',
            popoverProps: {popoverClassName: Classes.MINIMAL},
            filterable: false,
            $items: ['true', 'false'],
            items: button({text: currentText, rightIconName: 'caret-down', style: {marginBottom: 5}}),
            onItemSelect: this.onBoolChange,
            itemRenderer: ({handleClick, isActive, item}) => {
                return menuItem({key: item, onClick: handleClick, text: item, className: `xhField-${config.field}`, disabled: config.isDisabled});
            },
            disabled: config.isDisabled // must disable both the field and the menu items
        });
    }

    createNumberInput(config) {
        return numericInput({
            style: {marginBottom: 5},
            value: config.defaultValue,
            onValueChange: (number, numberAsString) => console.log(number, numberAsString), // no event passed from which to attach/grab the field
            disabled: config.isDisabled
        });
    }

    createTextAreaInput(config) {
        return textArea({
            style: {marginBottom: 5},
            defaultValue: config.defaultValue,
            onChange: this.onTextInputChange,
            disabled: config.isDisabled,
            model: this.model
        });
    }

    createTextInput(config) {
        return inputGroup({
            defaultValue: config.defaultValue,
            className: `xhField-${config.field}`,
            onChange: this.onTextInputChange,
            type: config.editor.type || 'text',
            style: {marginBottom: 5},
            disabled: config.isDisabled
        });
    }

    // for some reason inputGroups, numberInputs, and select/suggest change events all get different args passed
    onTextInputChange = (e) => {
        // temporary logic until we find a better way of getting this field
        const {setFormValue} = this.model,
            className = e.target.offsetParent.className,
            fieldIndex = className.indexOf('xhField'),
            field = className.substring(fieldIndex + 8, className.length),
            value = e.target.value;

        setFormValue(field, value);
    }

    onDropDownChange = (value, e) => {
        // temporary logic until we find a better way of getting this field
        const {setFormValue} = this.model,
            className = e.target.className,
            fieldIndex = className.indexOf('xhField'),
            field = className.substring(fieldIndex + 8, className.length);

        setFormValue(field, value);
    }

    onBoolChange = (value, e) => {
        // temporary logic until we find a better way of getting this field
        const {setFormValue} = this.model,
            className = e.target.className,
            fieldIndex = className.indexOf('xhField'),
            field = className.substring(fieldIndex + 8, className.length);
        
        console.log('boolChange');

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
export const restFormBlueprint = elemFactory(RestFormBlueprint);