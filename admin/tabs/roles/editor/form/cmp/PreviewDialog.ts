import {RoleEditorModel} from '@xh/hoist/admin/tabs/roles/editor/RoleEditorModel';
import {roleInspector} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspector';
import {hframe} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import './PreviewDialog.scss';

export const previewDialog = hoistCmp.factory<RoleEditorModel>(({model}) => {
    if (!model.isPreviewDialogOpen) return null;

    const {currentRoleInspectorModel, previewRoleInspectorModel, role, isRolePreviewVisible} =
            model,
        name = role?.name ?? previewRoleInspectorModel.role.name;

    return dialog({
        className: 'role-preview-dialog',
        isOpen: true,
        onClose: () => model.hidePreview(),
        icon: Icon.eye(),
        title: `Previewing ${role ? '' : 'New'} Role: "${name}"`,
        item: hframe(
            panel({
                compactHeader: true,
                headerClassName: 'role-preview-dialog__current-header',
                title: 'Current (Saved)',
                item: roleInspector({model: currentRoleInspectorModel}),
                omit: !role,
                modelConfig: {
                    collapsible: false,
                    defaultSize: '50%',
                    resizable: isRolePreviewVisible,
                    side: 'left'
                }
            }),
            panel({
                compactHeader: true,
                headerClassName: 'role-preview-dialog__unsaved-header',
                title: 'Your Version (Unsaved)',
                item: roleInspector({model: previewRoleInspectorModel}),
                omit: !isRolePreviewVisible
            })
        )
    });
});

/*
hframe(
        panel({
            compactHeader: true,
            title: 'Current',
            item: roleInspector({model: currentRoleInspectorModel}),
            omit: !isEditingExistingRole
        }),
        panel({
            compactHeader: true,
            title: 'Preview',
            item: roleInspector({model: previewRoleInspectorModel}),
            omit: !isPreviewVisible
        })
    )
 */
