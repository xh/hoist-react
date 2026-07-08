/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {hbox, hspacer, vbox} from '@xh/hoist/cmp/layout';
import {ViewInfo} from '@xh/hoist/cmp/viewmanager';
import {hoistCmp, HoistModel, HoistProps} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {every, isEmpty} from 'lodash';
import {ManageDialogModel} from '../ManageDialogModel';

/** Common surface of the edit panel models backing the shared {@link formButtons}. */
export interface EditPanelModel extends HoistModel {
    formModel: FormModel;
    views: ViewInfo[];
    allEditable: boolean;
    parent: ManageDialogModel;
    saveAsync(): Promise<void>;
    reset(): void;
}

interface FormButtonsProps extends HoistProps<EditPanelModel> {
    /** Group name to contextualize the delete confirm as a full-group deletion. */
    deleteGroupName?: string;
}

/**
 * Save/Revert buttons while the backing form is dirty, otherwise bulk Pin/Unpin and Delete
 * actions across the panel's views. Shared by the group and multi-view edit panels.
 */
export const formButtons = hoistCmp.factory<FormButtonsProps>({
    render({model, deleteGroupName}) {
        const {formModel, parent, views, allEditable} = model,
            allPinned = every(views, 'isPinned');

        if (formModel.isDirty) {
            return hbox({
                justifyContent: 'center',
                items: [
                    button({
                        text: 'Save Changes',
                        icon: Icon.check(),
                        intent: 'success',
                        minimal: false,
                        disabled: !formModel.isValid,
                        onClick: () => model.saveAsync()
                    }),
                    hspacer(),
                    button({
                        icon: Icon.reset(),
                        tooltip: 'Revert changes',
                        minimal: false,
                        onClick: () => model.reset()
                    })
                ]
            });
        }

        if (isEmpty(views)) return null;

        return vbox({
            style: {gap: 10, alignItems: 'center'},
            items: [
                button({
                    text: allPinned ? 'Unpin from your Menu' : 'Pin to your Menu',
                    icon: Icon.pin({
                        prefix: allPinned ? 'fas' : 'far',
                        className: allPinned ? 'xh-yellow' : ''
                    }),
                    width: 200,
                    outlined: true,
                    onClick: () => parent.togglePinned(views)
                }),
                button({
                    text: 'Delete',
                    icon: Icon.delete(),
                    width: 200,
                    outlined: true,
                    intent: 'danger',
                    omit: !allEditable,
                    onClick: () => parent.deleteAsync(views, deleteGroupName)
                })
            ]
        });
    }
});
