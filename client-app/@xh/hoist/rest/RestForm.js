/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {loadMask, message} from 'hoist/cmp';
import {filler, vframe, hbox} from 'hoist/layout';
import {Icon} from 'hoist/icon';
import {button, checkbox, dialog, dialogBody, dialogFooter, dialogFooterActions} from 'hoist/kit/blueprint';

import {restControl} from './RestControl'

@hoistComponent()
export class RestForm extends Component {

    render() {
        const {record, isAdd} = this.model;
        if (!record) return null;

        return dialog({
            title: isAdd ? 'Add Record' : 'Edit Record',
            icon: isAdd ? Icon.add() : Icon.edit(),
            cls: this.darkTheme ? 'xh-dark' : '',
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
            dialogFooter(
                dialogFooterActions(this.getButtons())
            ),
            message({model: model.messageModel}),
            loadMask({model: model.loadModel})
        ];
    }
    
    getForm() {
        return vframe(
            this.model.controlModels.map(model => restControl({model}))
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
