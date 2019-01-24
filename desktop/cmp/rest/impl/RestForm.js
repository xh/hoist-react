/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory, XH} from '@xh/hoist/core';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {filler, vframe} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/desktop/cmp/button';
import {form} from '@xh/hoist/cmp/form';

import {Icon} from '@xh/hoist/icon';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';

import {restControl} from './RestControl';

import './RestForm.scss';

@HoistComponent
export class RestForm extends Component {


    baseClassName = 'xh-rest-form';

    render() {
        const {record, isAdd, readonly, isOpen} = this.model;
        // if (!record) return null;
        return dialog({
            title: isAdd ? 'Add Record' : (!readonly ? 'Edit Record' : 'View Record'),
            icon: isAdd ? Icon.add() : Icon.edit(),
            className: this.getClassName(),
            isOpen,
            isCloseButtonShown: false,
            items: this.getDialogItems(),
            transitionName: 'none'
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
            mask({model: model.loadModel, spinner: true})
        ];
    }

    getForm() {
        const {model} = this,
            {formModel, fieldDefaults, formFields} = model;
        return vframe(
            form({
                model: formModel,
                fieldDefaults,
                items: formFields.map(f => restControl(f))
            })
        )
    }

    getButtons() {
        const {formModel, actions, parent} = this.model,
            {disabled, readonly} = formModel;
        return [
            recordActionBar({
                actions,
                record: formModel.getData(),
                gridModel: parent.gridModel
            }),
            filler(),
            button({
                text: readonly ? 'Cancel' : 'Close',
                onClick: this.onCloseClick
            }),
            button({
                text: 'Save',
                icon: Icon.check(),
                intent: 'success',
                disabled: !formModel.isValid || disabled,
                onClick: this.onSaveClick,
                omit: readonly
            })
        ];
    }

    onCloseClick = () => {
        this.model.close();
    };

    onSaveClick = () => {
        const model = this.model,
            isAdd = model.isAdd,
            warning = model.actionWarning[isAdd ? 'add' : 'edit'];

        if (warning) {
            XH.confirm({
                message: warning,
                title: 'Warning',
                icon: Icon.warning({size: 'lg'}),
                onConfirm: () => model.saveRecord()
            });
        } else {
            model.saveRecord();
        }
    };
}

export const restForm = elemFactory(RestForm);
