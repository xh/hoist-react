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
        model.saveRecord(model.formRecord);
    }
}
export const restFormBlueprint = elemFactory(RestFormBlueprint);