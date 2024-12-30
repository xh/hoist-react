/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {OptionsDialogModel} from '@xh/hoist/appcontainer/OptionsDialogModel';
import {form} from '@xh/hoist/cmp/form';
import {div, filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, restoreDefaultsButton} from '@xh/hoist/mobile/cmp/button';
import {formField} from '@xh/hoist/mobile/cmp/form';
import {mask} from '@xh/hoist/cmp/mask';
import './OptionsDialog.scss';
import {dialogPanel} from '@xh/hoist/mobile/cmp/panel';

/**
 * @internal
 */
export const optionsDialog = hoistCmp.factory({
    displayName: 'OptionsDialog',
    model: uses(OptionsDialogModel),

    render({model}) {
        const {hasOptions, isOpen, loadTask, formModel, reloadRequired} = model;
        if (!hasOptions || !isOpen) return null;

        return dialogPanel({
            title: `${XH.clientAppName} Options`,
            icon: Icon.options(),
            className: 'xh-options-dialog',
            isOpen: true,
            item: [
                mask({bind: loadTask, spinner: true}),
                form(
                    div({
                        className: 'xh-options-dialog__form',
                        items: [
                            ...model.options.map(option => {
                                return formField({field: option.name, ...option.formField});
                            }),
                            restoreDefaultsButton({
                                intent: 'danger',
                                minimal: false,
                                className: 'xh-options-dialog__restore-defaults-btn'
                            })
                        ]
                    })
                )
            ],
            bbar: [
                filler(),
                button({
                    text: 'Cancel',
                    minimal: true,
                    onClick: () => model.hide()
                }),
                button({
                    text: 'Save',
                    icon: reloadRequired ? Icon.refresh() : Icon.check(),
                    disabled: !formModel.isDirty,
                    onClick: () => model.saveAsync()
                })
            ]
        });
    }
});
