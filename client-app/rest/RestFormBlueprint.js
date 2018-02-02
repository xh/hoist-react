/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist';
import {vbox, div} from 'hoist/layout';
import {observer} from 'hoist/mobx';
import {inputGroup, button, label, dialog} from 'hoist/kit/blueprint';

@observer
export class RestFormBlueprint extends Component {

    render() {
        const {formRecord, formIsAdd} = this.props.model;
        if (!formRecord) return null;

        return dialog({
            iconName: 'inbox',
            isOpen: true,
            onClose: this.onClose,
            title: formIsAdd ? 'Add Record' : 'Edit Record',
            items: [
                div({
                    cls: 'pt-dialog-body',
                    items: this.getForm()
                }),
                div({
                    cls: 'pt-dialog-footer',
                    items: div({
                        cls: 'pt-dialog-footer-actions',
                        items: this.getButtons()
                    })
                })
            ]
        });
    }

    getForm() {
        const {editors, formRecord} = this.props.model,
            items = [];

        editors.forEach(editor => {
            const field = editor.name;
            items.push(label({text: field}));
            items.push(
                inputGroup({
                    value: formRecord[field] || '',
                    onChange: (e) => console.log(e),
                    type: editor.type || 'text',
                    disabled: editor.readOnly,
                    style: {marginBottom: 5}
                })
            );
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
    getButtons() {
        const {formIsValid, formIsWritable, enableDelete, formIsAdd} = this.props.model,
            ret = [];

        if (formIsWritable) {
            ret.push(
                button({
                    text: 'Save',
                    iconName: 'tick',
                    disabled: !formIsValid,
                    onClick: this.onSaveClick
                })
            );
        }

        if (enableDelete && !formIsAdd) {
            ret.push(
                button({
                    text: 'Delete',
                    iconName: 'cross',
                    disabled: !formIsValid,
                    onClick: this.onDeleteClick
                })
            );
        }

        return ret;
    }

    onClose = () => {
        this.props.model.closeForm();
    }

    onDeleteClick = () => {
        const model = this.props.model;
        model.deleteRecord(model.formRecord);
    }

    onSaveClick = () => {
        const model = this.props.model;
        model.saveRecord(model.formRecord);
    }
}
export const restFormBlueprint = elemFactory(RestFormBlueprint);