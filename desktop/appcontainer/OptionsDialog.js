/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
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
            {isOpen, loadModel, formModel, requiresRefresh} = model;

        if (!isOpen) return null;

        return dialog({
            title: 'Options',
            icon: Icon.gear(),
            style: {width: 400},
            isOpen: true,
            onClose: () => model.hide(),
            canOutsideClickClose: false,
            item: [
                panel({
                    mask: loadModel,
                    item: dialogBody(
                        form({
                            model: formModel,
                            fieldDefaults: {minimal: true, inline: true},
                            items: model.options.map(option => {
                                return formField({field: option.name, ...option.formField});
                            })
                        })
                    ),
                    bbar: toolbar(
                        button({
                            disabled: !formModel.isDirty,
                            text: 'Reset',
                            onClick: () => formModel.reset()
                        }),
                        filler(),
                        button({
                            text: 'Cancel',
                            onClick: () => model.hide()
                        }),
                        button({
                            disabled: !formModel.isDirty,
                            text: requiresRefresh ? 'Save & Reload' : 'Save',
                            icon: requiresRefresh ? Icon.refresh() : Icon.check(),
                            intent: 'success',
                            onClick: () => model.saveAsync()
                        })
                    )
                })
            ]
        });
    }
}

export const optionsDialog = elemFactory(OptionsDialog);
