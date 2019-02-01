/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog, dialogBody, HotkeysTarget, hotkeys, hotkey} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory, XH} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {filler, span} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {form} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {OptionsDialogModel} from '@xh/hoist/core/appcontainer/OptionsDialogModel';
import './OptionsDialog.scss';

/**
 * Dialog to provide a built-in editor for app-wide user preferences, as specified by
 * the `HoistAppModel.getAppOptions()` template method.
 *
 * @private
 */
@HoistComponent
@HotkeysTarget
export class OptionsDialog extends Component {

    static modelClass = OptionsDialogModel;

    baseClassName = 'xh-options-dialog';

    renderHotkeys() {
        return hotkeys(
            hotkey({
                global: true,
                combo: 'shift + o',
                label: 'Open Options Dialog',
                onKeyDown: this.onHotKey
            })
        );
    }

    render() {
        const {model} = this,
            {isOpen, loadModel, formModel, requiresRefresh} = model;

        if (!model.hasOptions) return null;
        if (!isOpen) return span();  // *Not* null, so hotkeys get rendered.

        return dialog({
            title: `${XH.clientAppName} Options`,
            icon: Icon.options(),
            className: this.getClassName(),
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

    onHotKey = () => {
        this.model.show();
    }
}

export const optionsDialog = elemFactory(OptionsDialog);
