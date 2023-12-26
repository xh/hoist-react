import {roleMembers} from '@xh/hoist/admin/tabs/general/roles/details/members/RoleMembers';
import {RoleModel} from '@xh/hoist/admin/tabs/general/roles/RoleModel';
import {FormModel} from '@xh/hoist/cmp/form';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {HoistRole} from '../Types';

export class RoleDetailsModel extends HoistModel {
    @lookup(() => RoleModel) readonly roleModel: RoleModel;

    @managed readonly formModel: FormModel = this.createFormModel();
    @managed readonly tabContainerModel = this.createTabContainerModel();

    get selectedRole(): HoistRole {
        return this.roleModel.selectedRole;
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
            persistWith: {...RoleModel.PERSIST_WITH, path: 'roleMembersTabContainer'},
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
