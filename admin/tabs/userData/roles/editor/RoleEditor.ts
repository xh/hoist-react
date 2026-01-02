/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {roleForm} from './form/RoleForm';
import {RoleEditorModel} from './RoleEditorModel';
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
                        text: 'Delete',
                        icon: Icon.delete(),
                        intent: 'danger',
                        disabled: !role,
                        onClick: () => model.deleteAsync()
                    }),
                    filler(),
                    button({
                        text: 'Cancel',
                        onClick: () => model.cancel()
                    }),
                    button({
                        text: 'Save Changes',
                        icon: Icon.check(),
                        intent: 'success',
                        outlined: true,
                        disabled: saveDisabled,
                        onClick: () => model.saveAsync()
                    })
                ]
            })
        });
    }
});
