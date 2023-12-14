import {roleMembers} from '@xh/hoist/admin/tabs/roles/details/members/RoleMembers';
import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {FormModel} from '@xh/hoist/cmp/form';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {HoistRole} from '../HoistRole';

export class RoleDetailsModel extends HoistModel {
    @lookup(() => RolesModel) readonly rolesModel: RolesModel;

    @managed readonly formModel: FormModel = this.createFormModel();
    @managed readonly tabContainerModel = this.createTabContainerModel();

    get selectedRole(): HoistRole {
        return this.rolesModel.selectedRole;
    }

    override onLinked() {
        this.addReaction({
            track: () => this.selectedRole,
            run: role => this.formModel.init(role ?? {})
        });
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    private createFormModel(): FormModel {
        return new FormModel({
            fields: [
                {
                    name: 'category'
                },
                {
                    name: 'notes'
                },
                {
                    name: 'lastUpdated'
                },
                {
                    name: 'lastUpdatedBy'
                }
            ],
            readonly: true
        });
    }

    private createTabContainerModel(): TabContainerModel {
        return new TabContainerModel({
            persistWith: {...RolesModel.PERSIST_WITH, path: 'roleMembersTabContainer'},
            switcher: false,
            tabs: [
                {
                    id: 'directMembers',
                    content: () => roleMembers({showEffective: false})
                },
                {
                    id: 'effectiveMembers',
                    content: () => roleMembers({showEffective: true})
                }
            ]
        });
    }
}
