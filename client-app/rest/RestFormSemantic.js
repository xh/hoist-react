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
import {button, dropdown, input, label, modal, modalContent, modalActions, modalHeader} from 'hoist/kit/semantic';

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
        const {editors, formRecord, setFormValue} = this.props.model,
            ret = [];

        editors.forEach(editor => {

            const field = editor.name;
            if (editor.type === 'bool') {
                ret.push(label({content: editor.label || field, style: {width: '115px', textAlign: 'center', paddingBottom: 5}}));
                ret.push(
                    dropdown({
                        className: 'rest-form-dropdown',
                        fluid: true,
                        inline: true,
                        options: [{text: 'True', value: 'true', key: 'True'}, {text: 'False', value: 'false', key: 'False'}],
                        placeholder: capitalize(formRecord[field].toString()),
                        onChange: (e, data) => setFormValue(field, data.value === 'true'),
                        disabled: editor.readOnly,
                        style: {marginBottom: 5}
                    })
                );
            } else {
                ret.push(label({content: editor.label || field, style: {width: '115px', textAlign: 'center', paddingBottom: 5}}));
                ret.push(
                    input({
                        defaultValue: formRecord[field] || '',
                        onChange: (e) => setFormValue(field, e.target.value),
                        type: editor.type || 'text',
                        disabled: editor.readOnly,
                        style: {marginBottom: 5}
                    })
                );
            }

        });

        return vbox({
            cls: 'rest-form',
            padding: 10,
            items: ret
        });
    }

    getButtons() {
        const {formIsValid, formIsWritable, enableDelete, formIsAdd} = this.props.model,
            ret = [];

        if (enableDelete && !formIsAdd) {
            ret.push(
                button({
                    content: 'Delete',
                    icon: {name: 'x', color: 'red'},
                    compact: true,
                    disabled: !formIsValid,
                    onClick: this.onDeleteClick
                })
            );
        }

        if (formIsWritable) {
            ret.push(
                button({
                    content: 'Save',
                    icon: {name: 'check', color: 'green'},
                    compact: true,
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
        model.saveFormRecord();
    }
}
export const restFormSemantic = elemFactory(RestFormSemantic);