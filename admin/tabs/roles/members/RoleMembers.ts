import {RoleMembersModel} from '@xh/hoist/admin/tabs/roles/members/RoleMembersModel';
import {placeholder} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp} from '@xh/hoist/core';
import './tab/RoleMembersTab.scss';

export const roleMembers = hoistCmp.factory({
    displayName: 'RoleMembers',
    model: creates(RoleMembersModel),
    render({model}) {
        if (!model.selectedRole) return placeholder('Select a role to view its members.');
        return tabContainer();
    }
});
