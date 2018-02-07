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
        const {editors, recordSpec} = this.model,
            fields = recordSpec.fields,
            ret = [];

        editors.forEach(editor => {
            const fieldSpec = fields.find(it => it.name === editor.field);

            ret.push(this.createFieldLabel(fieldSpec));

            if (fieldSpec.lookupValues) {
                ret.push(this.createDropdown(fieldSpec, editor));
            } else if (fieldSpec.type === 'bool' || fieldSpec.type === 'boolean') {
                ret.push(this.createBooleanDropdown(fieldSpec));
            } else if (fieldSpec.type === 'int') {
                ret.push(this.createNumberInput(fieldSpec, editor));
            } else if (editor.type === 'textarea' || fieldSpec.type === 'json') {
                ret.push(this.createTextAreaInput(fieldSpec, editor));
            } else {
                ret.push(this.createTextInput(fieldSpec, editor));
            }
        });

        return vbox({
            cls: 'rest-form',
            width: 400,
            padding: 10,
            items: ret
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

    onClose = (e) => {
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

    createDropdown(fieldSpec, editor) {
        const {formRecord} = this.model,
            field = fieldSpec.name,
            options = fieldSpec.lookupValues,
            defaultValue = formRecord[field],
            isDisabled = fieldSpec.readOnly || (editor.additionsOnly && !this.model.formIsAdd);

        // 'hack' to allow additions(not built in), overrides itemPredicate
        const itemListPredicate = editor.allowAdditions ? (q, v, index) => {
            if (q && !v.includes(q)) v.push(q);
            const ret = v.filter(it => it.includes(q));
            return q ? ret : v;
        } : null;

        return suggest({
            className: 'rest-form-dropdown-blueprint',
            popoverProps: {popoverClassName: Classes.MINIMAL, 'data-field': field, field: field},
            itemListPredicate: itemListPredicate,
            itemPredicate: (q, v, index) => !v || v.includes(q),
            style: {marginBottom: 5},
            $items: options,
            onItemSelect: this.onDropDownChange,
            itemRenderer: ({handleClick, isActive, item}) => {
                return menuItem({key: item, onClick: handleClick, text: item, className: `xhField-${field}`, disabled: isDisabled});
            },
            inputValueRenderer: s => s,
            inputProps: {defaultValue: defaultValue, value: undefined}, // console warning dictated this undefined if I want to use default val, need to somehow set on visible component
            disabled: isDisabled
        });
    }

    createBooleanDropdown(fieldSpec) {
        const {formRecord} = this.model,
            field = fieldSpec.name,
            isDisabled = fieldSpec.readOnly;

        return select({
            className: 'rest-form-dropdown-blueprint',
            popoverProps: {popoverClassName: Classes.MINIMAL},
            filterable: false,
            $items: ['true', 'false'],
            items: button({text: formRecord[field].toString(), rightIconName: 'caret-down', style: {marginBottom: 5}}),
            onItemSelect: this.onBoolChange,
            itemRenderer: ({handleClick, isActive, item}) => {
                return menuItem({key: item, onClick: handleClick, text: item, className: `xhField-${field}`, disabled: isDisabled});
            },
            disabled: isDisabled
        });
    }

    createNumberInput(fieldSpec, editor) {
        const {formRecord} = this.model,
            field = fieldSpec.name,
            renderer = editor.renderer,
            currentVal = renderer ? renderer(formRecord[field]) : formRecord[field],
            isDisabled = fieldSpec.readOnly;

        return numericInput({
            style: {marginBottom: 5},
            value: currentVal || '',
            onValueChange: (number, numberAsString) => console.log(number, numberAsString), // no event passed from which to attach/grab the field
            disabled: isDisabled
        });
    }

    createTextAreaInput(fieldSpec, editor) {
        const {formRecord} = this.model,
            field = fieldSpec.name,
            renderer = editor.renderer,
            currentVal = renderer ? renderer(formRecord[field]) : formRecord[field],
            isDisabled = fieldSpec.readOnly;

        return textArea({
            style: {marginBottom: 5},
            defaultValue: currentVal || '',
            onChange: this.onTextInputChange,
            disabled: isDisabled,
            field: field,
            model: this.model
        });
    }

    createTextInput(fieldSpec, editor) {
        // temporary logic until we find a better way of getting this field
        const {formRecord} = this.model,
            field = fieldSpec.name,
            renderer = editor.renderer,
            currentVal = renderer ? renderer(formRecord[field]) : formRecord[field],
            isDisabled = fieldSpec.readOnly;

        return inputGroup({
            defaultValue: currentVal || '',
            className: `xhField-${field}`,
            onChange: this.onTextInputChange,
            type: editor.type || 'text',
            style: {marginBottom: 5},
            disabled: isDisabled
        });
    }

    onTextInputChange = (e, arg2, arg3) => {
        // temporary logic until we find a better way of getting this field
        const {setFormValue, formRecord} = this.model,
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
        const {setFormValue} = this.model,
            className = e.target.className,
            fieldIndex = className.indexOf('xhField'),
            field = className.substring(fieldIndex + 8, className.length);

        setFormValue(field, value === 'true');
    }
}
export const restFormBlueprint = elemFactory(RestFormBlueprint);