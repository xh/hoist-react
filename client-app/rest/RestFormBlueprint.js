/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {capitalize} from 'lodash';
import {elemFactory} from 'hoist';
import {vbox, div, filler, span} from 'hoist/layout';
import {observer} from 'hoist/mobx';
import {Classes, button, dialog, inputGroup, label, menuItem, popover, suggest} from 'hoist/kit/blueprint';

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
            }
            // else if (fieldSpec.type === 'bool' || fieldSpec.type === 'boolean') {
            //     ret.push(this.createBooleanDropdown(fieldSpec));
            // } else if (fieldSpec.type === 'int') {
            //     ret.push(this.createNumberInput(fieldSpec, editor));
            // } else if (editor.type === 'textarea' || fieldSpec.type === 'json') {
            //     ret.push(this.createTextAreaInput(fieldSpec, editor));
            // } else {
            //     ret.push(this.createTextInput(fieldSpec, editor));
            // }
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
            popoverProps: {popoverClassName: Classes.MINIMAL},
            itemListPredicate: itemListPredicate,
            itemPredicate: (q, v, index) => !v || v.includes(q),
            style: {marginBottom: 5},
            $items: options,
            onItemSelect: this.onInputChange,
            itemRenderer: ({handleClick, isActive, item}) => {
                return menuItem({key: item, onClick: handleClick, text: item, disabled: isDisabled});
            },
            inputValueRenderer: s => s,
            inputProps: {placeholder: defaultValue},
            disabled: isDisabled
        });
    }

    // createBooleanDropdown(fieldSpec) {
    //     const {formRecord} = this.model,
    //         field = fieldSpec.name,
    //         options = [{text: 'True', value: 'true', key: 'True'}, {text: 'False', value: 'false', key: 'False'}],
    //         defaultValue = formRecord[field],
    //         isDisabled = fieldSpec.readOnly;
    //
    //     return dropdown({
    //         className: 'rest-form-dropdown',
    //         style: {marginBottom: 5},
    //         fluid: true,
    //         options: options,
    //         defaultValue: defaultValue != null ? defaultValue.toString() : '',
    //         onChange: this.onBoolChange,
    //         disabled: isDisabled,
    //         field: field,
    //         model: this.model
    //     });
    // }
    //
    // createNumberInput(fieldSpec, editor) {
    //     const {formRecord} = this.model,
    //         field = fieldSpec.name,
    //         renderer = editor.renderer,
    //         currentVal = renderer ? renderer(formRecord[field]) : formRecord[field],
    //         isDisabled = fieldSpec.readOnly;
    //
    //     return input({
    //         style: {marginBottom: 5},
    //         defaultValue: currentVal || '',
    //         onChange: this.onInputChange,
    //         type: 'number',
    //         disabled: isDisabled,
    //         field: field,
    //         model: this.model
    //     });
    // }
    //
    // createTextAreaInput(fieldSpec, editor) {
    //     const {formRecord} = this.model,
    //         field = fieldSpec.name,
    //         renderer = editor.renderer,
    //         currentVal = renderer ? renderer(formRecord[field]) : formRecord[field],
    //         isDisabled = fieldSpec.readOnly;
    //
    //     return textArea({
    //         style: {marginBottom: 5},
    //         defaultValue: currentVal || '',
    //         onChange: this.onInputChange,
    //         disabled: isDisabled,
    //         field: field,
    //         model: this.model
    //     });
    // }
    //
    // createTextInput(fieldSpec, editor) {
    //     const {formRecord} = this.model,
    //         field = fieldSpec.name,
    //         renderer = editor.renderer,
    //         currentVal = renderer ? renderer(formRecord[field]) : formRecord[field],
    //         isDisabled = fieldSpec.readOnly;
    //
    //     return input({
    //         style: {marginBottom: 5},
    //         defaultValue: currentVal || '',
    //         onChange: this.onInputChange,
    //         type: 'text',
    //         disabled: isDisabled,
    //         field: field,
    //         model: this.model
    //     });
    // }

    onAddItemToDropDown(e, data) {
        data.options.push({text: data.value, value: data.value, key: data.value});
    }

    onInputChange = (value, e) => {
        console.log(e);
        const {setFormValue} = this.model;
        //     field = data.field;
        //
        // setFormValue(field, value);
    }

    onBoolChange(value, data) {
        const {setFormValue} = data.model,
            field = data.field;

        setFormValue(field, value === 'true');
    }
}
export const restFormBlueprint = elemFactory(RestFormBlueprint);