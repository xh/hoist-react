/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {OptionsDialogModel} from '@xh/hoist/appcontainer/OptionsDialogModel';
import {form} from '@xh/hoist/cmp/form';
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {button, restoreDefaultsButton} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {dialog, dialogBody} from '@xh/hoist/kit/blueprint';
import './OptionsDialog.scss';

/**
 * Dialog to provide a built-in editor for app-wide user preferences, as specified by
 * the `HoistAppModel.getAppOptions()` template method.
 *
 * @internal
 */
export const optionsDialog = hoistCmp.factory({
    displayName: 'OptionsDialog',
    model: uses(OptionsDialogModel),
    className: 'xh-options-dialog',

    render({model, className}) {
        if (!model.hasOptions || !model.isOpen) return null;

        const {reloadRequired, formModel} = model;

        return dialog({
            title: `${XH.clientAppName} Options`,
            icon: Icon.options(),
            className,
            isOpen: true,
            onClose: () => model.hide(),
            canOutsideClickClose: false,
            item: [
                panel({
                    mask: 'onLoad',
                    item: dialogBody(
                        form({
                            model: formModel,
                            fieldDefaults: {minimal: true, inline: true},
                            items: model.options.map(option => {
                                return formField({field: option.name, ...option.formField});
                            })
                        })
                    ),
                    bbar: [
                        restoreDefaultsButton(),
                        filler(),
                        button({
                            text: 'Cancel',
                            onClick: () => model.hide()
                        }),
                        button({
                            disabled: !formModel.isDirty,
                            text: reloadRequired ? 'Save & Reload' : 'Save',
                            icon: reloadRequired ? Icon.refresh() : Icon.check(),
                            intent: 'success',
                            onClick: () => model.saveAsync()
                        })
                    ]
                })
            ]
        });
    }
});

