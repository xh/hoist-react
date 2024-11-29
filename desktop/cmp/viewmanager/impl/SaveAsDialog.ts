/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {form} from '@xh/hoist/cmp/form';
import {filler, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {SaveAsDialogModel} from '@xh/hoist/cmp/viewmanager/';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {dialog} from '@xh/hoist/kit/blueprint';
import {startCase} from 'lodash';

/**
 * @internal
 */
export const saveAsDialog = hoistCmp.factory<SaveAsDialogModel>({
    displayName: 'SaveDialog',
    className: 'xh-view-manager__save-dialog',
    model: uses(SaveAsDialogModel),

    render({model, className}) {
        if (!model.isOpen) return null;

        return dialog({
            title: `Save as...`,
            className,
            isOpen: true,
            style: {width: 500},
            canOutsideClickClose: false,
            onClose: () => model.cancel(),
            item: formPanel()
        });
    }
});

const formPanel = hoistCmp.factory<SaveAsDialogModel>({
    render({model}) {
        return panel({
            item: form({
                fieldDefaults: {
                    commitOnChange: true
                },
                item: vframe({
                    className: 'xh-view-manager__save-dialog__form',
                    items: [
                        formField({
                            field: 'name',
                            item: textInput({
                                autoFocus: true,
                                selectOnFocus: true,
                                onKeyDown: e => {
                                    if (e.key === 'Enter') model.saveAsAsync();
                                }
                            })
                        }),
                        formField({
                            field: 'description',
                            item: textArea({
                                selectOnFocus: true,
                                height: 90
                            })
                        })
                    ]
                })
            }),
            bbar: bbar(),
            mask: model.parent.saveTask
        });
    }
});

const bbar = hoistCmp.factory<SaveAsDialogModel>({
    render({model}) {
        const {typeDisplayName} = model;
        return toolbar(
            filler(),
            button({
                text: 'Cancel',
                onClick: () => model.cancel()
            }),
            button({
                text: `Save as new ${startCase(typeDisplayName)}`,
                outlined: true,
                intent: 'success',
                disabled: !model.formModel.isValid,
                onClick: () => model.saveAsAsync()
            })
        );
    }
});
