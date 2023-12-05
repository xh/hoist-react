import {roleMembersTab} from '@xh/hoist/admin/tabs/roles/members/tab/RoleMembersTab';
import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, HoistRole, lookup, managed} from '@xh/hoist/core';

export class RoleMembersModel extends HoistModel {
    @lookup(() => RolesModel) readonly rolesModel: RolesModel;

    @managed readonly tabContainerModel = new TabContainerModel({
        persistWith: {...RolesModel.PERSIST_WITH, path: 'roleMembersTabContainer'},
        tabs: [
            {
                id: 'directMembers',
                content: () => roleMembersTab({showEffective: false})
            },
            {
                id: 'effectiveMembers',
                content: () => roleMembersTab({showEffective: true})
            }
        ]
    });

    get selectedRole(): HoistRole {
        return this.rolesModel.selectedRole;
    }
}
