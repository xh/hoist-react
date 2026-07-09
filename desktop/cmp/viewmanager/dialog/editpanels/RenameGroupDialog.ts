/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {form} from '@xh/hoist/cmp/form';
import {filler, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {GroupPanelModel} from './GroupPanelModel';

/**
 * Dialog to rename a group in place, opened via the "Rename Group" context-menu item on the
 * Manage dialog's group rows. Backed by the same form and save flow as the selection-driven
 * GroupPanel.
 */
export const renameGroupDialog = hoistCmp.factory({
    model: uses(GroupPanelModel),
    render({model}) {
        const {isRenameDialogOpen, groupRecord, formModel, parent} = model;
        if (!isRenameDialogOpen || !groupRecord) return null;

        const saveAsync = async () => {
            if (await model.saveAsync()) model.isRenameDialogOpen = false;
        };

        // Cancelling discards any pending edit - the form is shared with the GroupPanel, which
        // would otherwise surface it as a dirty, unsaved change.
        const cancel = () => {
            model.reset();
            model.isRenameDialogOpen = false;
        };

        return dialog({
            title: 'Rename Group',
            icon: Icon.edit(),
            isOpen: true,
            style: {width: 400},
            canOutsideClickClose: false,
            onClose: () => cancel(),
            item: panel({
                item: form({
                    fieldDefaults: {
                        commitOnChange: true,
                        minimal: true
                    },
                    item: vframe({
                        className: 'xh-view-manager__manage-dialog__form',
                        item: formField({
                            field: 'name',
                            item: textInput({
                                autoFocus: true,
                                selectOnFocus: true,
                                onKeyDown: e => {
                                    if (e.key === 'Enter') saveAsync();
                                }
                            })
                        })
                    })
                }),
                bbar: [
                    filler(),
                    button({
                        text: 'Cancel',
                        onClick: () => cancel()
                    }),
                    button({
                        text: 'Save',
                        icon: Icon.check(),
                        intent: 'success',
                        outlined: true,
                        disabled: !formModel.isValid,
                        onClick: () => saveAsync()
                    })
                ],
                mask: parent.updateTask
            })
        });
    }
});
