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
import {hoistButton, input, modal, modalContent, modalActions, modalHeader} from 'hoist/kit/semantic';

@observer
export class RestFormSemantic extends Component {

    render() {
        const {formRecord, formIsAdd} = this.props.model;

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
    getForm() {
        const {editors, formRecord} = this.props.model;

        const items = editors.map(editor => {
            const field = editor.name;
            return input({
                value: formRecord[field] || '',
                onChange: (e) => console.log(e),
                type: editor.type || 'text',
                label: {content: editor.name, style: {width: '115px', verticalAlign: 'middle'}},
                disabled: editor.readOnly,
                style: {marginBottom: 5}
            });
        });

        return vbox({
            cls: 'rest-form',
            padding: 10,
            items
        });
    }

    getButtons() {
        const {formIsValid, formIsWritable, enableDelete, formIsAdd} = this.props.model,
            ret = [];

        if (enableDelete && !formIsAdd) {
            ret.push(
                hoistButton({
                    content: 'Delete',
                    icon: {name: 'x', color: 'red'},
                    disabled: !formIsValid,
                    onClick: this.onDeleteClick
                })
            );
        }

        if (formIsWritable) {
            ret.push(
                hoistButton({
                    content: 'Save',
                    icon: {name: 'check', color: 'green'},
                    disabled: !formIsValid,
                    onClick: this.onSaveClick
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
export const restFormSemantic = elemFactory(RestFormSemantic);