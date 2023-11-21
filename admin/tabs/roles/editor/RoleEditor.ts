import {previewDialog} from '@xh/hoist/admin/tabs/roles/editor/form/cmp/PreviewDialog';
import {roleForm} from '@xh/hoist/admin/tabs/roles/editor/form/RoleForm';
import {RoleEditorModel} from '@xh/hoist/admin/tabs/roles/editor/RoleEditorModel';
import {filler, fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import './RoleEditor.scss';

export const roleEditor = hoistCmp.factory({
    className: 'role-editor',
    displayName: 'RoleEditor',
    model: uses(RoleEditorModel),
    render({className, model}) {
        const {isOpen, role, saveDisabled, previewTask, savingTask} = model;
        if (!isOpen) return null;
        return fragment(
            previewDialog(),
            dialog({
                className,
                canOutsideClickClose: false,
                isOpen: true,
                onClose: () => model.cancel(),
                icon: role ? Icon.edit() : Icon.add(),
                title: role ? `Editing Role: "${role.name}"` : 'New Role',
                item: panel({
                    item: roleForm(),
                    mask: [previewTask, savingTask],
                    bbar: [
                        button({
                            onClick: () => model.showPreviewAsync(),
                            icon: Icon.eye(),
                            text: 'Preview'
                        }),
                        filler(),
                        button({
                            onClick: () => model.cancel(),
                            intent: 'danger',
                            text: 'Cancel'
                        }),
                        button({
                            onClick: () => model.saveAsync(),
                            intent: 'success',
                            text: 'Save',
                            disabled: saveDisabled
                        })
                    ]
                })
            })
        );
    }
});
