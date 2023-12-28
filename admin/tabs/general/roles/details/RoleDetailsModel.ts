import {roleMembers} from '@xh/hoist/admin/tabs/general/roles/details/members/RoleMembers';
import {RoleModel} from '@xh/hoist/admin/tabs/general/roles/RoleModel';
import {FormModel} from '@xh/hoist/cmp/form';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {HoistRole} from '../Types';
import {fmtDateTimeSec} from '@xh/hoist/format';

export class RoleDetailsModel extends HoistModel {
    @lookup(() => RoleModel) readonly roleModel: RoleModel;

    @managed readonly formModel: FormModel = this.createFormModel();
    @managed readonly tabContainerModel = this.createTabContainerModel();

    get role(): HoistRole {
        return this.roleModel.selectedRole;
    }

    override onLinked() {
        this.addReaction({
            track: () => this.role,
            run: role => {
                if (!role) {
                    this.formModel.init({});
                } else {
                    this.formModel.init({
                        ...role,
                        category: role.category ?? 'Uncategorized',
                        lastUpdated: `${role.lastUpdatedBy} (${fmtDateTimeSec(role.lastUpdated)})`
                    });
                }
            }
        });
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    private createFormModel(): FormModel {
        return new FormModel({
            fields: [{name: 'name'}, {name: 'category'}, {name: 'notes'}, {name: 'lastUpdated'}],
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
