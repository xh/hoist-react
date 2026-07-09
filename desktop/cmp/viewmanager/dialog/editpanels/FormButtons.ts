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
    /** May resolve to a flag indicating whether changes were applied - ignored here. */
    saveAsync(): Promise<void | boolean>;
    reset(): void;
}

interface FormButtonsProps extends HoistProps<EditPanelModel> {
    /** Group name to contextualize the delete confirm as a full-group deletion. */
    groupName?: string;
}

/**
 * Save/Revert buttons while the backing form is dirty, otherwise bulk Pin/Unpin and Delete
 * actions across the panel's views. Shared by the group and multi-view edit panels.
 */
export const formButtons = hoistCmp.factory<FormButtonsProps>({
    render({model, groupName}) {
        const {formModel, parent, views, allEditable} = model,
            allPinned = every(views, 'isPinned'),
            isGroupRow = !!groupName;

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

        const groupViews = isGroupRow ? "group's views " : '';
        return vbox({
            style: {gap: 10, alignItems: 'center'},
            items: [
                button({
                    text: allPinned
                        ? `Unpin ${groupViews}from your Menu`
                        : `Pin ${groupViews}to your Menu`,
                    icon: Icon.pin({
                        prefix: allPinned ? 'fas' : 'far',
                        className: allPinned ? 'xh-yellow' : ''
                    }),
                    minWidth: 200,
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
                    onClick: () => parent.deleteAsync(views, groupName)
                })
            ]
        });
    }
});
