/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {roleForm} from '@xh/hoist/admin/tabs/general/roles/editor/form/RoleForm';
import {RoleEditorModel} from '@xh/hoist/admin/tabs/general/roles/editor/RoleEditorModel';
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import './RoleEditor.scss';

export const roleEditor = hoistCmp.factory({
    className: 'xh-admin-role-editor',
    displayName: 'RoleEditor',
    model: uses(RoleEditorModel),
    render({className, model}) {
        const {isOpen, role, saveDisabled, savingTask} = model;
        if (!isOpen) return null;
        return dialog({
            className,
            canOutsideClickClose: false,
            isOpen: true,
            onClose: () => model.cancel(),
            icon: role ? Icon.edit() : Icon.add(),
            title: role ? `Editing Role: ${role.name}` : 'New Role',
            item: panel({
                item: roleForm(),
                mask: savingTask,
                bbar: [
                    button({
                        onClick: () => model.deleteAsync(),
                        icon: Icon.delete(),
                        intent: 'danger',
                        text: 'Delete',
                        disabled: !role
                    }),
                    filler(),
                    button({
                        onClick: () => model.cancel(),
                        text: 'Cancel'
                    }),
                    button({
                        onClick: () => model.saveAsync(),
                        icon: Icon.check(),
                        intent: 'success',
                        text: 'Save',
                        disabled: saveDisabled
                    })
                ]
            })
        });
    }
});
