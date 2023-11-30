import {roleGraph} from '@xh/hoist/admin/tabs/roles/inspector/graph/RoleGraph';
import {RoleInspectorModel} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspectorModel';
import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {vframe} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';

export const roleInspector = hoistCmp.factory({
    className: 'role-inspector',
    displayName: 'RoleInspector',
    model: creates(RoleInspectorModel),
    render({className}) {
        return vframe(
            tabContainer({className}),
            panel({
                item: roleGraph(),
                modelConfig: {
                    collapsible: false,
                    defaultSize: '50%',
                    modalSupport: true,
                    persistWith: {...RolesModel.PERSIST_WITH, path: 'roleInspectorGraphPanel'},
                    resizable: true,
                    side: 'bottom'
                }
            })
        );
    }
});
