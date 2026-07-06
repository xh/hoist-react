/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {div, filler, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {select, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {pluralize} from '@xh/hoist/utils/js';
import {EditGroupDialogModel} from './EditGroupDialogModel';
import {getGroupPathOptions, groupPathOptionRenderer} from './Utils';

/**
 * Dialog to rename or re-parent a view group, cascading to all views within it. Launched from
 * the "Edit Group" context menu on group rows within the manage dialog grids.
 */
export const editGroupDialog = hoistCmp.factory<EditGroupDialogModel>({
    displayName: 'EditGroupDialog',
    className: 'xh-view-manager__edit-group-dialog',
    model: uses(EditGroupDialogModel),

    render({model, className}) {
        if (!model.isOpen) return null;

        return dialog({
            title: `Editing Group: ${model.group}`,
            icon: Icon.edit(),
            className,
            isOpen: true,
            style: {width: 500},
            canOutsideClickClose: false,
            onClose: () => model.close(),
            item: editPanel()
        });
    }
});

const editPanel = hoistCmp.factory<EditGroupDialogModel>({
    render({model}) {
        const {parent, group, isGlobal} = model,
            {viewManagerModel} = parent;

        return panel({
            item: vbox({
                className: 'xh-view-manager__edit-group-dialog__pane',
                items: [
                    textInput({
                        model,
                        bind: 'leaf',
                        autoFocus: true,
                        commitOnChange: true,
                        placeholder: 'Group name',
                        onKeyDown: e => {
                            if (e.key === 'Enter') model.saveAsync();
                        },
                        width: null
                    }),
                    div({
                        className: 'xh-view-manager__edit-group-dialog__label',
                        item: 'Nest under'
                    }),
                    select({
                        model,
                        bind: 'nestUnder',
                        options: getGroupPathOptions(viewManagerModel, isGlobal, {
                            includeRoot: true,
                            excludeSubtreeOf: group
                        }),
                        optionRenderer: groupPathOptionRenderer,
                        enableFilter: true,
                        width: null
                    }),
                    div({
                        className: 'xh-view-manager__edit-group-dialog__info xh-text-color-muted',
                        item: `Renames this group for all ${pluralize(viewManagerModel.typeDisplayName)} within it.`
                    })
                ]
            }),
            bbar: toolbar(
                filler(),
                button({text: 'Cancel', onClick: () => model.close()}),
                button({
                    text: 'OK',
                    icon: Icon.check(),
                    intent: 'success',
                    disabled: !model.isValid,
                    onClick: () => model.saveAsync()
                })
            ),
            mask: parent.updateTask
        });
    }
});
