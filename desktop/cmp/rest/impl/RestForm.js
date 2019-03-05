/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {filler, vframe} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/desktop/cmp/button';
import {form} from '@xh/hoist/cmp/form';
import {Icon} from '@xh/hoist/icon';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';

import './RestForm.scss';
import {restFormField} from './RestFormField';

@HoistComponent
export class RestForm extends Component {

    baseClassName = 'xh-rest-form';

    render() {
        const {model} = this,
            {isAdd, readonly, isOpen} = this.model;
        if (!isOpen) return null;

        return dialog({
            title: isAdd ? 'Add Record' : (!readonly ? 'Edit Record' : 'View Record'),
            icon: isAdd ? Icon.add() : Icon.edit(),
            className: this.getClassName(),
            isOpen: true,
            isCloseButtonShown: false,
            items: [
                this.renderForm(),
                this.renderToolbar(),
                mask({model: model.loadModel, spinner: true})
            ],
            transitionName: 'none'
        });
    }

    //------------------------
    // Implementation
    //------------------------
    renderForm() {
        const {model} = this,
            formFields = model.editors.map(editor => {
                return restFormField({editor, model});
            });

        return dialogBody(
            form({
                model: model.formModel,
                fieldDefaults: {
                    commitOnChange: true,
                    minimal: true,
                    inline: true,
                    labelWidth: 120,
                    labelAlign: 'right'
                },
                item: vframe(formFields)
            })
        );
    }

    renderToolbar() {
        const {model} = this,
            {formModel} = model;
        return toolbar(
            recordActionBar({
                actions: model.actions,
                record: model.currentRecord,
                gridModel: model.parent.gridModel
            }),
            filler(),
            button({
                text: formModel.readonly ? 'Close' : 'Cancel',
                onClick: () => model.close()
            }),
            button({
                text: 'Save',
                icon: Icon.check(),
                intent: 'success',
                disabled: !model.isAdd && !formModel.isDirty,
                onClick: () => model.validateAndSaveAsync(),
                omit: formModel.readonly
            })
        );
    }
}
export const restForm = elemFactory(RestForm);
