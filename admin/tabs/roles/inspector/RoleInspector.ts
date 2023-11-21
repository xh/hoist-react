import {RoleInspectorModel} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspectorModel';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp, uses} from '@xh/hoist/core';

export const roleInspector = hoistCmp.factory({
    className: 'role-inspector',
    displayName: 'RoleInspector',
    model: uses(RoleInspectorModel),
    render({className}) {
        return tabContainer({className});
    }
});
