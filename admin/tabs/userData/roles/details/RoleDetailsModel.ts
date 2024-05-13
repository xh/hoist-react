/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {roleMembers} from './members/RoleMembers';
import {userMembers} from './members/UserMembers';
import {directoryMembers} from './members/DirectoryMembers';
import {RoleModel} from '../RoleModel';
import {FormModel} from '@xh/hoist/cmp/form';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {fmtDateTimeSec} from '@xh/hoist/format';
import {HoistRole} from '../Types';

export class RoleDetailsModel extends HoistModel {
    @lookup(() => RoleModel) readonly roleModel: RoleModel;

    @managed formModel: FormModel;
    @managed tabContainerModel: TabContainerModel;

    get role(): HoistRole {
        return this.roleModel.selectedRole;
    }

    override onLinked() {
        this.formModel = this.createFormModel();
        this.tabContainerModel = this.createTabContainerModel();

        this.addReaction({
            track: () => this.role,
            run: role => {
                !role
                    ? this.formModel.init({})
                    : this.formModel.init({
                          ...role,
                          category: role.category ?? 'Uncategorized',
                          lastUpdated: `${role.lastUpdatedBy} (${fmtDateTimeSec(role.lastUpdated)})`
                      });
            }
        });
    }

    //------------------
    // Implementation
    //------------------
    private createFormModel(): FormModel {
        return new FormModel({
            fields: [{name: 'name'}, {name: 'category'}, {name: 'notes'}, {name: 'lastUpdated'}],
            readonly: true
        });
    }

    private createTabContainerModel(): TabContainerModel {
        return new TabContainerModel({
            persistWith: {...RoleModel.PERSIST_WITH, path: 'roleMembersTabContainer'},
            switcher: true,
            tabs: [
                {
                    id: 'users',
                    tooltip: 'All resolved users with this role',
                    content: userMembers
                },
                {
                    id: 'directories',
                    tooltip: 'Directories contributing users to this role',
                    omit: !this.roleModel.moduleConfig.directoryGroupsSupported,
                    content: directoryMembers
                },
                {
                    id: 'inheritedRoles',
                    title: 'Inheriting From',
                    tooltip: 'Roles gained by this role transitively.',
                    content: () => roleMembers({type: 'inherited'})
                },
                {
                    id: 'inheritingRoles',
                    title: 'Granting To',
                    tooltip: 'Roles that effectively have this role as well',
                    content: () => roleMembers({type: 'inheriting'})
                }
            ]
        });
    }
}
