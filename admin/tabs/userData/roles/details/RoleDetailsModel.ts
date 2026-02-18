/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {badge} from '@xh/hoist/cmp/badge';
import {hbox} from '@xh/hoist/cmp/layout';
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
                this.formModel.init(
                    role
                        ? {
                              ...role,
                              category: role.category ?? 'Uncategorized',
                              lastUpdated: `${role.lastUpdatedBy} @ ${fmtDateTimeSec(role.lastUpdated)}`
                          }
                        : {}
                );

                this.setTabTitle('users', 'Users', role?.effectiveUsers);
                this.setTabTitle('directories', 'Dir. Groups', role?.effectiveDirectoryGroups);
                this.setTabTitle('effectiveRoles', 'Granted To', role?.effectiveRoles);
                this.setTabTitle('inheritedRoles', 'Inheriting From', role?.inheritedRoles);
            },
            fireImmediately: true
        });
    }

    //------------------
    // Implementation
    //------------------
    private setTabTitle(id: string, name: string, col: any[]) {
        const title = col != null ? hbox(name, badge(col.length)) : name;
        this.tabContainerModel.setTabTitle(id, title);
    }

    private createFormModel(): FormModel {
        return new FormModel({
            fields: [{name: 'name'}, {name: 'category'}, {name: 'notes'}, {name: 'lastUpdated'}],
            readonly: true
        });
    }

    private createTabContainerModel(): TabContainerModel {
        return new TabContainerModel({
            tabs: [
                {
                    id: 'users',
                    content: userMembers
                },
                {
                    id: 'directories',
                    title: 'Dir. Groups',
                    omit: !this.roleModel.moduleConfig.directoryGroupsSupported,
                    content: directoryMembers
                },
                {
                    id: 'effectiveRoles',
                    content: () => roleMembers({type: 'effective'})
                },
                {
                    id: 'inheritedRoles',
                    content: () => roleMembers({type: 'inherited'})
                }
            ]
        });
    }
}
