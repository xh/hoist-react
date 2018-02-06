/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist';
import {capitalize} from 'lodash';
import {vbox} from 'hoist/layout';
import {observer} from 'hoist/mobx';
import {dropdown, hoistButton, input, label, modal, modalContent, modalActions, modalHeader} from 'hoist/kit/semantic';

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
        const {editors, recordSpec} = this.model,
            fields = recordSpec.fields,
            ret = [];

        editors.forEach(editor => {
            const fieldSpec = fields.find(it => it.name === editor.field);

            ret.push(this.createFieldLabel(fieldSpec));
            // this will probably turn into a switch statement
            if (fieldSpec.lookupValues) {
                ret.push(this.createDropdown(fieldSpec, editor));
            } else if (fieldSpec.type === 'bool' || fieldSpec.type === 'boolean') {
                ret.push(this.createBooleanDropdown(fieldSpec));
            } else {
                ret.push(this.createTextInput(fieldSpec, editor));
            }

        });

        return vbox({
            cls: 'rest-form',
            padding: 10,
            items: ret
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

    createDropdown(fieldSpec, editor) {
        const {formRecord, setFormValue} = this.model,
            field = fieldSpec.name,
            options = fieldSpec.lookupValues.map(v => {
                return {text: v, value: v, key: v};
            }),
            isDisabled = fieldSpec.readOnly || (editor.additionsOnly && !this.model.formIsAdd);

        return dropdown({
            className: 'rest-form-dropdown',
            fluid: true,
            inline: true,
            options: options,
            defaultValue: formRecord[field] != null ? capitalize(formRecord[field].toString()) : '',
            onChange: this.onSelectionChange(),
            allowAdditions: editor.allowAdditions,
            onAddItem: this.onAddItemToDropDown,
            search: true,
            selection: true,
            disabled: isDisabled,
            style: {marginBottom: 5}
        });
    }

    createBooleanDropdown(fieldSpec) {
        const {formRecord, setFormValue} = this.model,
            field = fieldSpec.name;

        return dropdown({
            className: 'rest-form-dropdown',
            fluid: true,
            inline: true,
            options: [{text: 'True', value: 'true', key: 'True'}, {text: 'False', value: 'false', key: 'False'}],
            defaultValue: formRecord[field] != null ? formRecord[field].toString() : '',
            onChange: this.onBoolChange,
            disabled: fieldSpec.readOnly,
            style: {marginBottom: 5}
        });
    }

    createTextInput(fieldSpec, editor) {
        const {formRecord, setFormValue} = this.model,
            field = fieldSpec.name,
            renderer = editor.renderer,
            currentVal = renderer ? renderer(formRecord[field]) : formRecord[field],
            isTextArea = fieldSpec.type === 'textarea' || fieldSpec.type === 'json';

        return input({
            defaultValue: currentVal || '',
            onChange: (e) => setFormValue(field, e.target.value),
            type: isTextArea ? 'textarea' : 'text',
            disabled: fieldSpec.readOnly,
            style: {marginBottom: 5}
        });
    }

    //----------------
    // Implementation
    //----------------

    onAddItemToDropDown(e, data) {
        console.log('onAddItem');
        data.options.push({text: data.value, value: data.value, key: data.value});
    }

    onSelectionChange(e, data) {
        setFormValue(field, data.value);
    }

    onBoolChange(e, data) {
        setFormValue(field, data.value === 'true');
    }
}
export const restFormSemantic = elemFactory(RestFormSemantic);