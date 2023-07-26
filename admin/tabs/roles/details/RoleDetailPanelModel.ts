import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {makeObservable, observable} from 'mobx';
import {AllRolesPanelModel} from './../AllRolesPanelModel';
import {DashContainerModel} from '@xh/hoist/desktop/cmp/dash';
import {p} from '@xh/hoist/cmp/layout';
import {rolesWidget} from './RolesWidget';
import {usersWidget} from './UsersWidget';

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
                        width: 60,
                        content: [
                            {
                                type: 'view',
                                id: 'inheritedRoles'
                            },
                            {
                                type: 'view',
                                id: 'assignedUsers'
                            }
                        ]
                    },
                    {
                        type: 'column',
                        width: 40,
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
                content: p('filler for effective users')
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
