/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {loadMask, message, toolbar} from 'hoist/cmp';
import {filler, vframe} from 'hoist/layout';
import {Icon} from 'hoist/icon';
import {button, dialog, dialogBody} from 'hoist/kit/blueprint';

import {restControl} from './RestControl';
import './RestForm.scss';

@hoistComponent()
export class RestForm extends Component {

    render() {
        const {record, isAdd} = this.model;
        if (!record) return null;

        return dialog({
            title: isAdd ? 'Add Record' : 'Edit Record',
            icon: isAdd ? Icon.add() : Icon.edit(),
            isOpen: true,
            isCloseButtonShown: false,
            items: this.getDialogItems()
        });
    }

    //------------------------
    // Implementation
    //------------------------
    getDialogItems() {
        const model = this.model;
        return [
            dialogBody(this.getForm()),
            toolbar(this.getButtons()),
            message({model: model.messageModel}),
            loadMask({model: model.loadModel})
        ];
    }
    
    getForm() {
        return vframe(
            this.model.controlModels.map((model, idx) => {
                if (idx == 0) {
                    return restControl({model, autoFocus: true});
                }
                return restControl({model});
            })
        );
    }

    getButtons() {
        const {isValid, isWritable, isDirty, isAdd, actionEnabled} = this.model;

        return [
            button({
                text: 'Delete',
                icon: Icon.delete(),
                intent: 'danger',
                onClick: this.onDeleteClick,
                omit: !actionEnabled.del || isAdd
            }),
            filler(),
            button({
                text: 'Cancel',
                onClick: this.onCloseClick
            }),
            button({
                text: 'Save',
                icon: Icon.check(),
                intent: 'success',
                disabled: !isValid  || !isDirty,
                onClick: this.onSaveClick,
                omit: !isWritable
            })
        ];
    }

    onCloseClick = () => {
        this.model.close();
    }

    onDeleteClick = () => {
        const model = this.model,
            warning = model.actionWarning.del;

        if (warning) {
            model.messageModel.confirm({
                message: warning,
                onConfirm: () => model.deleteRecord()
            });
        } else {
            model.deleteRecord();
        }
    }

    onSaveClick = () => {
        const model = this.model,
            isAdd = model.isAdd,
            warning = model.actionWarning[isAdd ? 'add' : 'edit'];

        if (warning) {
            model.messageModel.confirm({
                message: warning,
                onConfirm: () => model.saveRecord()
            });
        } else {
            model.saveRecord();
        }
    }
}
export const restForm = elemFactory(RestForm);
