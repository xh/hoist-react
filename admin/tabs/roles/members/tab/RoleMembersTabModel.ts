import {RoleMembersTabProps} from './RoleMembersTab';
import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {hbox, hframe} from '@xh/hoist/cmp/layout';
import {HoistModel, HoistRole, lookup, managed} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {tag} from '@xh/hoist/kit/blueprint';
import {bindable} from '@xh/hoist/mobx';

export class RoleMembersTabModel extends HoistModel {
    static readonly types = {
        USER: '1-user',
        DIRECTORY_GROUP: '2-directory-group',
        ROLE: '3-role'
    };

    @lookup(() => RolesModel) readonly rolesModel: RolesModel;
    @managed gridModel: GridModel;

    @bindable showInherited = true;

    get props(): RoleMembersTabProps {
        return super.componentProps as RoleMembersTabProps;
    }

    get selectedRole(): HoistRole {
        return this.rolesModel.selectedRole;
    }

    override onLinked() {
        this.gridModel = this.createGridModel();
        this.addReaction({
            track: () => this.selectedRole,
            run: role => this.loadGridData(role),
            fireImmediately: true,
            debounce: 100
        });
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    private loadGridData(role: HoistRole) {
        if (!role) {
            this.gridModel.clear();
            return;
        }

        if (this.props.showEffective) {
            const {name} = role;

            this.gridModel.loadData([
                // 1 - Users
                ...role.effectiveUsers.map(it => ({
                    name: it.name,
                    roles: this.sortThisRoleFirst(it.sourceRoles),
                    isInherited: !it.sourceRoles.includes(name),
                    type: RoleMembersTabModel.types.USER
                })),

                // 2 - Directory Groups
                ...role.effectiveDirectoryGroups.map(it => ({
                    name: it.name,
                    roles: this.sortThisRoleFirst(it.sourceRoles),
                    isInherited: !it.sourceRoles.includes(name),
                    type: RoleMembersTabModel.types.DIRECTORY_GROUP
                })),

                // 3 - Roles
                ...role.effectiveRoles.map(it => ({
                    name: it.name,
                    roles: this.sortThisRoleFirst(it.sourceRoles),
                    isInherited: !it.sourceRoles.includes(name),
                    type: RoleMembersTabModel.types.ROLE
                }))
            ]);
        } else {
            this.gridModel.loadData(
                role.members.map(it => ({...it, type: RoleMembersTabModel.types[it.type]}))
            );
        }
    }

    private createGridModel(): GridModel {
        const {types} = RoleMembersTabModel,
            {showEffective} = this.props;
        return new GridModel({
            store: {
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'type', type: 'string'},
                    {name: 'roles', displayName: 'Assigned Via', type: 'tags'},
                    {name: 'isInherited', type: 'bool'}
                ],
                idSpec: data => `${this.selectedRole.name}:${data.type}:${data.name}`
            },
            emptyText: 'This role has no members.',
            filterModel: true,
            groupBy: 'type',
            headerMenuDisplay: 'hover',
            sortBy: 'name',
            onRowDoubleClicked: ({data: record}) => {
                if (!record) return;
                const {type, name} = record.data;
                if (type === types.ROLE) this.rolesModel.selectRole(name);
            },
            groupRowRenderer: ({value}) => {
                switch (value) {
                    case types.USER:
                        return hframe({
                            className: 'group-row-renderer',
                            items: [Icon.user(), 'Users']
                        });
                    case types.DIRECTORY_GROUP:
                        return hframe({
                            className: 'group-row-renderer',
                            items: [Icon.users(), 'Directory Groups']
                        });
                    case types.ROLE:
                        return hframe({
                            className: 'group-row-renderer',
                            items: [Icon.idBadge(), 'Roles']
                        });
                }
            },
            colDefaults: {
                filterable: true
            },
            columns: [
                {field: 'name'},
                {field: 'type', hidden: true},
                {
                    field: 'roles',
                    flex: true,
                    renderer: (roles: string[]) =>
                        hbox({
                            className: 'roles-renderer',
                            items: roles.map(role => {
                                const isThisRole = role === this.selectedRole.name;
                                return tag({
                                    className: 'roles-renderer__role',
                                    intent: isThisRole ? null : 'primary',
                                    item: isThisRole ? '<Direct>' : role,
                                    minimal: true
                                });
                            })
                        }),
                    omit: !showEffective
                },
                {
                    field: {name: 'dateCreated', displayName: 'Assigned', type: 'date'},
                    ...Col.dateTime,
                    omit: showEffective
                },
                {
                    field: {name: 'createdBy', displayName: 'Assigned By', type: 'string'},
                    omit: showEffective
                }
            ]
        });
    }

    private sortThisRoleFirst(roles: string[]): string[] {
        roles = [...roles].sort();
        const thisRoleIdx = roles.indexOf(this.selectedRole.name);
        if (thisRoleIdx === -1) return roles;
        return [
            this.selectedRole.name,
            ...roles.slice(0, thisRoleIdx),
            ...roles.slice(thisRoleIdx + 1)
        ];
    }
}
