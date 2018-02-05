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
        const {editors} = this.model,
            ret = [];

        editors.forEach(editor => {
            ret.push(this.createFieldLabel(editor));

            // this will probably turn into a switch statement
            if (editor.type === 'bool') {
                ret.push(this.createBooleanField(editor));
            } else {
                ret.push(this.createTextField(editor));
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

    createFieldLabel(editor) {
        return label({content: editor.label || editor.name, style: {width: '115px', textAlign: 'center', paddingBottom: 5}});
    }

    createBooleanField(editor) {
        const {formRecord, setFormValue} = this.model,
            field = editor.name;
        return  dropdown({
            className: 'rest-form-dropdown',
            fluid: true,
            inline: true,
            options: [{text: 'True', value: 'true', key: 'True'}, {text: 'False', value: 'false', key: 'False'}],
            placeholder: capitalize(formRecord[field].toString()),
            onChange: (e, data) => setFormValue(field, data.value === 'true'),
            disabled: editor.readOnly,
            style: {marginBottom: 5}
        });
    }

    createTextField(editor) {
        const {formRecord, setFormValue} = this.model,
            field = editor.name,
            renderer = editor.renderer,
            currentVal = renderer ? renderer(formRecord[field]) : formRecord[field];
        return input({
            defaultValue: currentVal || '',
            onChange: (e) => setFormValue(field, e.target.value),
            type: 'text',
            disabled: editor.readOnly, // on the RestField now
            style: {marginBottom: 5}
        });
    }
}
export const restFormSemantic = elemFactory(RestFormSemantic);