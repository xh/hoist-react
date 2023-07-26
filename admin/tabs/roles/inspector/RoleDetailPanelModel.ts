import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {makeObservable, observable} from 'mobx';
import {AllRolesPanelModel} from '../AllRolesPanelModel';
import {DashContainerModel} from '@xh/hoist/desktop/cmp/dash';
import {rolesWidget} from './RolesWidget';
import {usersWidget} from './UsersWidget';
import {allUsersWidget} from './AllUsersWidget';

export class RoleDetailPanelModel extends HoistModel {
    @observable roleId = null;
    @observable roleDetails = null;

    @lookup(AllRolesPanelModel) parentModel;

    @managed
    dashContainerModel = new DashContainerModel({
        showMenuButton: true,
        initialState: [
            {
                type: 'row',
                content: [
                    {
                        type: 'column',
                        width: 50,
                        content: [
                            {
                                type: 'view',
                                id: 'assignedUsers'
                            },
                            {
                                type: 'view',
                                id: 'inheritedRoles'
                            }
                        ]
                    },
                    {
                        type: 'column',
                        width: 50,
                        content: [
                            {
                                type: 'view',
                                id: 'effectiveUsers'
                            }
                        ]
                    }
                ]
            }
        ],
        viewSpecs: [
            {
                id: 'inheritedRoles',
                title: 'Inherited roles',
                unique: true,
                content: rolesWidget()
            },
            {
                id: 'assignedUsers',
                title: 'Assigned users',
                unique: true,
                content: usersWidget()
            },
            {
                id: 'effectiveUsers',
                title: 'Impacted Users',
                unique: true,
                content: allUsersWidget()
            }
        ]
    });

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.parentModel.selectedRecord,
            run: role => {
                this.roleId = role?.id ?? null;
                this.roleDetails = role?.data ?? null;
            },
            debounce: 30
        });
    }
}
