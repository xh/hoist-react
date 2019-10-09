/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {vframe, filler} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {mask} from '@xh/hoist/mobile/cmp/mask';
import {form} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/mobile/cmp/form';
import {button} from '@xh/hoist/mobile/cmp/button';

import {OptionsDialogModel} from '@xh/hoist/appcontainer/OptionsDialogModel';
import './OptionsDialog.scss';

/**
 * Display Options dialog
 *
 * @private
 */
export const optionsDialog = hoistCmp.factory({
    displayName: 'OptionsDialog',
    model: uses(OptionsDialogModel),

    render({model}) {
        const {isOpen, loadModel, formModel, reloadRequired} = model;

        if (!isOpen) return null;

        return dialog({
            title: 'Options',
            icon: Icon.options(),
            className: 'xh-options-dialog',
            isOpen: true,
            onCancel: () => model.hide(),
            content: [
                mask({model: loadModel, spinner: true}),
                form({
                    item: vframe(
                        ...model.options.map(option => {
                            return formField({field: option.name, ...option.formField});
                        })
                    )
                })
            ],
            buttons: [
                button({
                    disabled: !formModel.isDirty,
                    text: 'Reset',
                    modifier: 'quiet',
                    onClick: () => formModel.reset()
                }),
                filler(),
                button({
                    text: 'Cancel',
                    modifier: 'quiet',
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