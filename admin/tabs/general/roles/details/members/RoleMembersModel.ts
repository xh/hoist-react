import {RoleMembersProps} from '@xh/hoist/admin/tabs/general/roles/details/members/RoleMembers';
import {RoleDetailsModel} from '@xh/hoist/admin/tabs/general/roles/details/RoleDetailsModel';
import {RoleModel} from '@xh/hoist/admin/tabs/general/roles/RoleModel';
import {
    HoistRole,
    RoleMemberType,
    RoleServiceConfig
} from '@xh/hoist/admin/tabs/general/roles/Types';
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {hbox, hframe} from '@xh/hoist/cmp/layout';
import {HoistModel, lookup, managed, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {tag} from '@xh/hoist/kit/blueprint';
import {bindable} from '@xh/hoist/mobx';
import classNames from 'classnames';
import {first, invert, sortBy, uniqBy} from 'lodash';
import {computed} from 'mobx';

export class RoleMembersModel extends HoistModel {
    static readonly types: Record<RoleMemberType, string> = {
        USER: '1-user',
        DIRECTORY_GROUP: '2-directory-group',
        ROLE: '3-role'
    };

    @lookup(() => RoleModel) readonly roleModel: RoleModel;
    @lookup(() => RoleDetailsModel) readonly roleDetailsModel: RoleDetailsModel;

    @managed gridModel: GridModel;

    @bindable showInherited = true;

    get props(): RoleMembersProps {
        return this.componentProps as RoleMembersProps;
    }

    get selectedRole(): HoistRole {
        return this.roleModel.selectedRole;
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
            DIRECTORY_GROUP: this.softConfig?.assignDirectoryGroups
                ? effectiveDirectoryGroups.length
                : 0,
            ROLE: effectiveRoles.length
        };
    }

    get activeTabId(): string {
        return this.roleDetailsModel.tabContainerModel.activeTabId;
    }

    get softConfig(): RoleServiceConfig {
        return XH.getConf('xhRoleModuleConfig');
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
                ...(this.softConfig?.assignDirectoryGroups
                    ? role.effectiveDirectoryGroups.map(it => ({
                          name: it.name,
                          sources: this.sortThisRoleFirst(it.sourceRoles.map(role => ({role}))),
                          type: RoleMembersModel.types.DIRECTORY_GROUP
                      }))
                    : []),

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
            contextMenu: [...this.createFilterActions(), '-', ...GridModel.defaultContextMenu],
            emptyText: 'This role has no members.',
            groupBy: 'type',
            sortBy: 'name',
            onRowDoubleClicked: ({data: record}) => {
                if (!record) return;
                const {type, name} = record.data;
                if (type === types.ROLE) this.roleModel.selectRoleAsync(name);
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
                {
                    field: 'name',
                    autosizeMaxWidth: 300,
                    renderer: (name, {record}) =>
                        record.get('type') === types.DIRECTORY_GROUP
                            ? this.fmtDirectoryGroup(name)
                            : name,
                    tooltip: true
                },
                {field: 'type', hidden: true},
                {
                    field: 'sources',
                    flex: true,
                    minWidth: 105,
                    renderer: (sources: Array<{role: string; directoryGroup?: string}>) =>
                        hbox({
                            className: 'roles-renderer',
                            items: uniqBy(
                                sources.map(({role, directoryGroup}) => {
                                    const isThisRole = role === this.selectedRole.name;
                                    return {
                                        className: classNames(
                                            'roles-renderer__role',
                                            !isThisRole && 'roles-renderer__role--effective'
                                        ),
                                        intent: isThisRole ? null : 'primary',
                                        item: isThisRole
                                            ? this.fmtDirectoryGroup(directoryGroup) ?? '<Direct>'
                                            : role,
                                        title: isThisRole ? directoryGroup ?? '<Direct>' : role,
                                        minimal: true,
                                        onClick: () =>
                                            !isThisRole && this.roleModel.selectRoleAsync(role)
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

    private createFilterActions(): RecordActionSpec[] {
        const {roleModel} = this,
            {types} = RoleMembersModel,
            typesMap = invert(types) as Record<string, RoleMemberType>;
        return [false, true].map(includeEffective => ({
            icon: Icon.filter(),
            actionFn: ({record}) =>
                roleModel &&
                roleModel.applyMemberFilter(
                    record.get('name'),
                    typesMap[record.get('type')],
                    includeEffective
                ),
            displayFn: ({record}) => {
                if (!record) return {hidden: true};
                const {name, type} = record.data,
                    {softConfig} = this;

                if (
                    !includeEffective &&
                    ((type === types.USER && !softConfig.assignUsers) ||
                        (type === types.DIRECTORY_GROUP && !softConfig.assignDirectoryGroups))
                ) {
                    return {hidden: true};
                }

                return {
                    text: `Roles that ${
                        includeEffective ? 'effectively' : 'directly'
                    } include ${name}`
                };
            }
        }));
    }

    private sortThisRoleFirst<T extends {role: string; directoryGroup?: string}>(
        sources: T[]
    ): T[] {
        sources = sortBy(sources, source => `${source.role}:${source.directoryGroup ?? ''}`);
        const thisRole = sources.filter(it => it.role === this.selectedRole.name) ?? [];
        return [...thisRole, ...sources.filter(it => it.role !== this.selectedRole.name)];
    }

    private fmtDirectoryGroup(name?: string): string {
        return name?.startsWith('CN=') ? first(name.split(',')).substring(3) : name;
    }
}
