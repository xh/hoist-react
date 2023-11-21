import {RoleInspectorModel} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspectorModel';
import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import {hbox, hframe} from '@xh/hoist/cmp/layout';
import {HoistModel, HoistRole, lookup, managed, ReactionSpec} from '@xh/hoist/core';
import {withFilterByField} from '@xh/hoist/data';
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
    @lookup(() => RolesModel) readonly rolesModel: RolesModel;
    @managed readonly gridModel: GridModel = this.createGridModel();

    @bindable showInherited = true;

    get role(): HoistRole {
        return this.roleInspectorModel.role;
    }

    override onLinked() {
        this.initPersist();
        this.addReaction(this.roleReaction(), this.showInheritedReaction());
    }

    // -------------------------------
    // Reactions
    // -------------------------------

    roleReaction(): ReactionSpec<HoistRole> {
        return {
            track: () => this.role,
            run: role => this.loadGridData(role),
            fireImmediately: true,
            debounce: 100
        };
    }

    showInheritedReaction(): ReactionSpec<boolean> {
        const {filterModel} = this.gridModel;
        return {
            track: () => this.showInherited,
            run: showInherited =>
                filterModel.setFilter(
                    withFilterByField(
                        filterModel.filter,
                        showInherited ? null : {field: 'isInherited', op: '!=', value: true},
                        'isInherited'
                    )
                ),
            fireImmediately: true
        };
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    private initPersist() {
        if (this.roleInspectorModel.persistWith) {
            this.persistWith = {...this.roleInspectorModel.persistWith, path: 'RoleMembers'};
            this.markPersist('showInherited');
        }
    }

    private loadGridData(role: HoistRole) {
        if (!role) {
            this.gridModel.clear();
            return;
        }

        const {name} = role,
            {types} = RoleMembersModel;

        this.gridModel.loadData([
            // 1 - Users
            ...role.allUsers.map(it => ({
                name: it.name,
                roles: this.sortThisRoleFirst(it.roles),
                isInherited: !it.roles.includes(name),
                type: types.USER
            })),

            // 2 - Directory Groups
            ...role.allDirectoryGroups.map(it => ({
                name: it.name,
                roles: this.sortThisRoleFirst(it.roles),
                isInherited: !it.roles.includes(name),
                type: types.DIRECTORY_GROUP
            })),

            // 3a - Roles Directly Inheriting This Role
            ...role.directlyInheritedBy.map(it => ({
                name: it,
                roles: [name],
                type: types.ROLE
            })),

            // 3b - Roles Indirectly Inheriting This Role
            ...role.indirectlyInheritedBy.map(inheritedBy => {
                const {inheritanceMap} = this.rolesModel.getRole(inheritedBy),
                    inheritanceChain = [];

                for (let next = name; next && next !== inheritedBy; next = inheritanceMap[next]) {
                    inheritanceChain.unshift(next);
                }

                return {
                    name: inheritedBy,
                    roles: inheritanceChain,
                    type: types.ROLE,
                    isInherited: true
                };
            })
        ]);
    }

    private createGridModel(): GridModel {
        const {types} = RoleMembersModel;
        return new GridModel({
            store: {
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'type', type: 'string'},
                    {name: 'roles', displayName: 'Assigned Via', type: 'tags'},
                    {name: 'isInherited', type: 'bool'}
                ],
                idSpec: data => `${this.role.name}:${data.type}:${data.name}`
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
                            items: [Icon.roles(), 'Roles']
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
                    renderer: (roles, {record}) =>
                        hbox({
                            className: 'roles-renderer',
                            items: roles.flatMap(role => [
                                record.get('type') === types.ROLE ? Icon.arrowLeft() : null,
                                tag({
                                    className: 'roles-renderer__role',
                                    intent: role === this.role.name ? null : 'primary',
                                    item: role,
                                    minimal: true,
                                    title: role === this.role.name ? null : 'Inherited'
                                })
                            ])
                        })
                }
            ]
        });
    }

    private sortThisRoleFirst(roles: string[]): string[] {
        const thisRoleIdx = roles.indexOf(this.role.name);
        if (thisRoleIdx === -1) return roles;
        return [this.role.name, ...roles.slice(0, thisRoleIdx), ...roles.slice(thisRoleIdx + 1)];
    }
}
