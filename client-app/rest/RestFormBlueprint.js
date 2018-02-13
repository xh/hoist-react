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
import {inputGroup, button, label, dialog, dialogBody, dialogFooter, dialogFooterActions} from 'hoist/kit/blueprint';

@observer
export class RestFormBlueprint extends Component {

    render() {
        const {formRecord, formIsAdd} = this.model;
        if (!formRecord) return null;

        return dialog({
            title: formIsAdd ? 'Add Record' : 'Edit Record',
            icon: 'inbox',
            isOpen: true,
            onClose: this.onClose,
            items: [
                dialogBody(this.getForm()),
                dialogFooter(
                    dialogFooterActions(this.getButtons())
                )
            ]
        });
    }

    getForm() {
        const {editors, formRecord, setFormValue} = this.model,
            items = [];

        editors.forEach(editor => {
            const field = editor.field;
            let input;
            items.push(label({text: editor.label || field}));

            input = inputGroup({
                defaultValue: formRecord[field] || '',
                onChange: (e) => setFormValue(field, e.target.value),
                type: editor.type || 'text',
                disabled: editor.readOnly,
                style: {marginBottom: 5}
            });

            items.push(input);
        });

        return vbox({
            cls: 'rest-form',
            width: 400,
            padding: 10,
            items
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    get model() {return this.props.model}

    getButtons() {
        const {formIsValid, formIsWritable, enableDelete, formIsAdd} = this.model;

        return [
            button({
                text: 'Delete',
                icon: 'cross',
                disabled: !formIsValid,
                onClick: this.onDeleteClick,
                omit: !enableDelete || formIsAdd
            }),
            button({
                text: 'Save',
                icon: 'tick',
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
}
export const restFormBlueprint = elemFactory(RestFormBlueprint);