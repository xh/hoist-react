/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {OptionsDialogModel} from '@xh/hoist/appcontainer/OptionsDialogModel';
import {form} from '@xh/hoist/cmp/form';
import {filler, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, restoreDefaultsButton} from '@xh/hoist/mobile/cmp/button';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {formField} from '@xh/hoist/mobile/cmp/form';
import {mask} from '@xh/hoist/mobile/cmp/mask';
import './OptionsDialog.scss';

/**
 * @internal
 */
export const optionsDialog = hoistCmp.factory({
    displayName: 'OptionsDialog',
    model: uses(OptionsDialogModel),

    render({model}) {
        if (!model.hasOptions || !model.isOpen) return null;

        const {loadTask, formModel, reloadRequired} = model;

        return dialog({
            title: 'Options',
            icon: Icon.options(),
            className: 'xh-options-dialog',
            isOpen: true,
            onCancel: () => model.hide(),
            content: [
                mask({bind: loadTask, spinner: true}),
                form(
                    vframe(
                        model.options.map(option => {
                            return formField({field: option.name, ...option.formField});
                        })
                    )
                )
            ],
            buttons: [
                restoreDefaultsButton(),
                filler(),
                button({
                    text: 'Cancel',
                    minimal: true,
                    onClick: () => model.hide()
                }),
                button({
                    disabled: !formModel.isDirty,
                    text: 'Save',
                    icon: reloadRequired ? Icon.refresh() : Icon.check(),
                    onClick: () => model.saveAsync()
                })
            ]
        });
    }
});
