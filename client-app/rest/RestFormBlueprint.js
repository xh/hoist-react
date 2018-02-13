/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {button, dialog, dialogBody, dialogFooter, dialogFooterActions} from 'hoist/kit/blueprint';
import {elemFactory} from 'hoist';
import {filler} from 'hoist/layout';
import {action, observer} from 'hoist/mobx';

import {confirm} from 'hoist/cmp/confirm/Confirm.js';

@observer
export class RestFormBlueprint extends Component {

    render() {
        const {formRecord, formIsAdd} = this.restFormModel;
        if (!formRecord) return null;

        return dialog({
            title: formIsAdd ? 'Add Record' : 'Edit Record',
            iconName: 'inbox',
            isOpen: true,
            isCloseButtonShown: false,
            items: this.renderDialogItems()
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    get model() {return this.props.model}
    get restFormModel() {return this.props.model.restFormModel}

    renderDialogItems() {
        const items = [
            dialogBody(this.restFormModel.getForm()),
            dialogFooter(
                dialogFooterActions(this.getButtons())
            ),
            confirm({model: this.restFormModel.confirmModel})
        ];

        return items;
    }

    getButtons() {
        const {formIsValid, formIsWritable, enableDelete, formIsAdd} = this.restFormModel;

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
        this.restFormModel.closeForm();
    }

    onDeleteClick = () => {
        const {confirmModel} = this.restFormModel;
        confirmModel.show({
            message: 'Are you sure you want to delete this record?',
            onConfirm: this.doDelete
        });
    }

    doDelete = () => {
        const model = this.model;
        model.deleteRecord(model.formRecord);
    }

    @action
    onSaveClick = () => {
        const {editWarning, confirmModel} = this.restFormModel;
        if (editWarning) {
            confirmModel.show({
                message: editWarning,
                onConfirm: this.doSave
            });
        } else {
            this.doSave();
        }
    }

    @action
    doSave = () => {
        const model = this.model;
        model.saveFormRecord();
    }
}
export const restFormBlueprint = elemFactory(RestFormBlueprint);