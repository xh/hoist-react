import {RoleMembersProps} from '@xh/hoist/admin/tabs/roles/inspector/members/RoleMembers';
import {RoleInspectorModel} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspectorModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {hbox, hframe} from '@xh/hoist/cmp/layout';
import {HoistModel, HoistRole, lookup, managed} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {tag} from '@xh/hoist/kit/blueprint';
import {bindable} from '@xh/hoist/mobx';

export class RoleMembersModel extends HoistModel {
    static readonly types = {
        USER: '1-user',
        DIRECTORY_GROUP: '2-directory-group',
        ROLE: '3-role'
    };

    @lookup(() => RoleInspectorModel) readonly roleInspectorModel: RoleInspectorModel;
    @managed gridModel: GridModel;

    @bindable showInherited = true;

    get props(): RoleMembersProps {
        return super.componentProps as RoleMembersProps;
    }

    get selectedRole(): HoistRole {
        return this.roleInspectorModel.selectedRole;
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
                    roles: this.sortThisRoleFirst(it.roles),
                    isInherited: !it.roles.includes(name),
                    type: RoleMembersModel.types.USER
                })),

                // 2 - Directory Groups
                ...role.effectiveDirectoryGroups.map(it => ({
                    name: it.name,
                    roles: this.sortThisRoleFirst(it.roles),
                    isInherited: !it.roles.includes(name),
                    type: RoleMembersModel.types.DIRECTORY_GROUP
                })),

                // 3 - Roles
                ...role.effectiveRoles.map(it => ({
                    name: it.name,
                    roles: this.sortThisRoleFirst(it.roles),
                    isInherited: !it.roles.includes(name),
                    type: RoleMembersModel.types.ROLE
                }))
            ]);
        } else {
            this.gridModel.loadData(
                role.members.map(it => ({...it, type: RoleMembersModel.types[it.type]}))
            );
        }
    }

    private createGridModel(): GridModel {
        const {types} = RoleMembersModel,
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
            emptyText: 'No members inherit this role.',
            filterModel: true,
            groupBy: 'type',
            headerMenuDisplay: 'hover',
            sortBy: 'name',
            onRowDoubleClicked: ({data: record}) => {
                if (!record) return;
                const {type, name} = record.data;
                if (type === types.ROLE) this.roleInspectorModel.selectRole(name);
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
                                    item: role + (isThisRole ? ' (this role)' : ''),
                                    minimal: true
                                });
                            })
                        }),
                    omit: !showEffective
                },
                {
                    field: {name: 'dateCreated', type: 'date'},
                    ...Col.dateTime,
                    omit: showEffective
                },
                {
                    field: {name: 'createdBy', type: 'string'},
                    omit: showEffective
                }
            ]
        });
    }

    private sortThisRoleFirst(roles: string[]): string[] {
        const thisRoleIdx = roles.indexOf(this.selectedRole.name);
        if (thisRoleIdx === -1) return roles;
        return [
            this.selectedRole.name,
            ...roles.slice(0, thisRoleIdx),
            ...roles.slice(thisRoleIdx + 1)
        ];
    }
}
