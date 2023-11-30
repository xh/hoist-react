import {roleMembers} from '@xh/hoist/admin/tabs/roles/inspector/members/RoleMembers';
import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {TabConfig, TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, HoistRole, lookup, managed} from '@xh/hoist/core';
import {compact} from 'lodash';

export class RoleInspectorModel extends HoistModel {
    override persistWith = {...RolesModel.PERSIST_WITH, path: 'roleInspector'};
    @lookup(RolesModel) readonly rolesModel: RolesModel;
    @managed readonly tabContainerModel: TabContainerModel = this.createTabContainerModel();

    get allRoles(): HoistRole[] {
        return this.rolesModel.allRoles;
    }

    get selectedRole(): HoistRole {
        return this.rolesModel.selectedRole;
    }

    selectRole(name: string) {
        this.rolesModel.selectRole(name);
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    private createTabContainerModel(): TabContainerModel {
        return new TabContainerModel({
            persistWith: this.persistWith && {
                ...this.persistWith,
                path: compact([this.persistWith.path, 'TabContainer']).join()
            },
            tabs: this.createTabs()
        });
    }

    private createTabs(): TabConfig[] {
        return [
            {
                id: 'members',
                content: () => roleMembers({showEffective: false})
            },
            {
                id: 'effectiveMembers',
                content: () => roleMembers({showEffective: true})
            }
        ];
    }
}
