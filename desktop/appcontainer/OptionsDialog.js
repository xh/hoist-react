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
            {isOpen, hasChanges, requiresRefresh} = model;

        if (!isOpen) return null;

        return dialog({
            title: 'Options',
            icon: Icon.gear(),
            style: {width: 400},
            isOpen: true,
            onClose: this.onCloseClick,
            canOutsideClickClose: false,
            item: [
                dialogBody(...model.options.map(it => this.renderControl(it))),
                toolbar(
                    button({
                        disabled: !hasChanges,
                        text: 'Reset',
                        onClick: this.onResetClick
                    }),
                    filler(),
                    button({
                        text: 'Cancel',
                        onClick: this.onCloseClick
                    }),
                    button({
                        disabled: !hasChanges,
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
        const {label, field, control, disabled} = cfg;

        return formField({
            label: label,
            field: field,
            item: control,
            model: this.model,
            disabled: disabled,
            minimal: true,
            inline: true
        });
    }

    onResetClick = () => {
        this.model.reset();
    }

    onSaveClick = () => {
        this.model.save();
    }

    onCloseClick = () => {
        this.model.hide();
    }
}

export const optionsDialog = elemFactory(OptionsDialog);
