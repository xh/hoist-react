/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {filler} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {form} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';

/**
 * A dialog component to manage user preferences from directly within the application.
 *
 * @private
 */
@HoistComponent
export class OptionsDialog extends Component {

    render() {
        const {model} = this,
            {isOpen, formModel, requiresRefresh} = model;

        if (!isOpen) return null;

        return dialog({
            title: 'Options',
            icon: Icon.gear(),
            style: {width: 400},
            isOpen: true,
            onClose: this.onCloseClick,
            canOutsideClickClose: false,
            item: [
                dialogBody(
                    form({
                        model: formModel,
                        fieldDefaults: {minimal: true, inline: true},
                        items: model.options.map(it => this.renderControl(it))
                    })
                ),
                toolbar(
                    button({
                        disabled: !formModel.isDirty,
                        text: 'Reset',
                        onClick: this.onResetClick
                    }),
                    filler(),
                    button({
                        text: 'Cancel',
                        onClick: this.onCloseClick
                    }),
                    button({
                        disabled: !formModel.isDirty,
                        text: requiresRefresh ? 'Save & Reload' : 'Save',
                        icon: requiresRefresh ? Icon.refresh() : Icon.check(),
                        intent: 'success',
                        onClick: this.onSaveClick
                    })
                )
            ]
        });
    }

    renderControl(cfg) {
        const {name, control} = cfg;
        return formField({field: name, item: control});
    }

    onResetClick = () => {
        this.model.formModel.reset();
    };

    onSaveClick = () => {
        this.model.saveAsync();
    };

    onCloseClick = () => {
        this.model.hide();
    };
}

export const optionsDialog = elemFactory(OptionsDialog);
