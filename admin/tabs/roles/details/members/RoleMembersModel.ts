import {RoleDetailsModel} from '@xh/hoist/admin/tabs/roles/details/RoleDetailsModel';
import {HoistRole, RoleMemberType} from '@xh/hoist/admin/tabs/roles/HoistRole';
import {sortBy, uniqBy} from 'lodash';
import {computed} from 'mobx';
import {RoleMembersTabProps} from './RoleMembers';
import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {hbox, hframe} from '@xh/hoist/cmp/layout';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {tag} from '@xh/hoist/kit/blueprint';
import {bindable} from '@xh/hoist/mobx';

export class RoleMembersModel extends HoistModel {
    static readonly types: Record<RoleMemberType, string> = {
        USER: '1-user',
        DIRECTORY_GROUP: '2-directory-group',
        ROLE: '3-role'
    };

    @lookup(() => RolesModel) readonly rolesModel: RolesModel;
    @lookup(() => RoleDetailsModel) readonly roleDetailsModel: RoleDetailsModel;

    @managed gridModel: GridModel;

    @bindable showInherited = true;

    get props(): RoleMembersTabProps {
        return this.componentProps as RoleMembersTabProps;
    }

    get selectedRole(): HoistRole {
        return this.rolesModel.selectedRole;
    }

    @computed
    get directCounts(): Record<RoleMemberType, number> {
        if (!this.selectedRole) return null;
        const {users, directoryGroups, roles} = this.selectedRole;
        return {
            USER: users.length,
            DIRECTORY_GROUP: directoryGroups.length,
            ROLE: roles.length
        };
    }

    @computed
    get effectiveCounts(): Record<RoleMemberType, number> {
        if (!this.selectedRole) return null;
        const {effectiveUsers, effectiveDirectoryGroups, effectiveRoles} = this.selectedRole;
        return {
            USER: effectiveUsers.length,
            DIRECTORY_GROUP: effectiveDirectoryGroups.length,
            ROLE: effectiveRoles.length
        };
    }

    get activeTabId(): string {
        return this.roleDetailsModel.tabContainerModel.activeTabId;
    }

    setActiveTabId(id: string) {
        this.roleDetailsModel.tabContainerModel.activateTab(id);
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
            this.gridModel.loadData([
                // 1 - Users
                ...role.effectiveUsers.map(it => ({
                    name: it.name,
                    sources: this.sortThisRoleFirst(it.sources),
                    type: RoleMembersModel.types.USER
                })),

                // 2 - Directory Groups
                ...role.effectiveDirectoryGroups.map(it => ({
                    name: it.name,
                    sources: this.sortThisRoleFirst(it.sourceRoles.map(role => ({role}))),
                    type: RoleMembersModel.types.DIRECTORY_GROUP
                })),

                // 3 - Roles
                ...role.effectiveRoles.map(it => ({
                    name: it.name,
                    sources: this.sortThisRoleFirst(it.sourceRoles.map(role => ({role}))),
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
                    {name: 'sources', displayName: 'Assigned Via', type: 'json'}
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
                    field: 'sources',
                    flex: true,
                    renderer: (sources: Array<{role: string; directoryGroup?: string}>) =>
                        hbox({
                            className: 'roles-renderer',
                            items: uniqBy(
                                sources.map(({role, directoryGroup}) => {
                                    const isThisRole = role === this.selectedRole.name;
                                    return {
                                        className: 'roles-renderer__role',
                                        intent: isThisRole ? null : 'primary',
                                        item: isThisRole ? directoryGroup ?? '<Direct>' : role,
                                        minimal: true
                                    };
                                }),
                                'item'
                            ).map(props => tag(props))
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

    private sortThisRoleFirst<T extends {role: string; directoryGroup?: string}>(
        sources: T[]
    ): T[] {
        sources = sortBy(sources, source => `${source.role}:${source.directoryGroup ?? ''}`);
        const thisRole = sources.filter(it => it.role === this.selectedRole.name) ?? [];
        return [...thisRole, ...sources.filter(it => it.role !== this.selectedRole.name)];
    }
}
