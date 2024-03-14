/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {RoleMembersProps} from '@xh/hoist/admin/tabs/general/roles/details/members/RoleMembers';
import {RoleDetailsModel} from '@xh/hoist/admin/tabs/general/roles/details/RoleDetailsModel';
import {RoleModel} from '@xh/hoist/admin/tabs/general/roles/RoleModel';
import {
    HoistRole,
    RoleMemberType,
    RoleModuleConfig
} from '@xh/hoist/admin/tabs/general/roles/Types';
import {ColumnRenderer, GridModel, GroupRowRenderer} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {box, hbox, hframe} from '@xh/hoist/cmp/layout';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {tag} from '@xh/hoist/kit/blueprint';
import {bindable} from '@xh/hoist/mobx';
import classNames from 'classnames';
import {invert, sortBy, uniq, uniqBy} from 'lodash';
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
    get inheritedRolesCount(): Record<string, number> {
        if (!this.selectedRole) return null;
        return {
            ROLE: this.selectedRole.inheritedRoles.length
        };
    }

    @computed
    get effectiveCounts(): Record<RoleMemberType, number> {
        if (!this.selectedRole) return null;
        const {effectiveUsers, effectiveDirectoryGroups, effectiveRoles} = this.selectedRole;
        return {
            USER: effectiveUsers.length,
            DIRECTORY_GROUP: this.moduleConfig?.directoryGroupsSupported
                ? effectiveDirectoryGroups.length
                : 0,
            ROLE: effectiveRoles.length
        };
    }

    get activeTabId(): string {
        return this.roleDetailsModel.tabContainerModel.activeTabId;
    }

    get moduleConfig(): RoleModuleConfig {
        return this.roleModel.moduleConfig;
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

        if (!this.props.showInherited) {
            this.gridModel.loadData([
                // 1 - Users
                ...role.effectiveUsers.map(it => ({
                    name: it.name,
                    sources: this.sortThisRoleFirst(it.sources),
                    type: RoleMembersModel.types.USER,
                    dateCreated: role.members.find(member => member.name === it.name)?.dateCreated,
                    createdBy: role.members.find(member => member.name === it.name)?.createdBy
                })),

                // 2 - Directory Groups
                ...(this.moduleConfig?.directoryGroupsSupported
                    ? role.effectiveDirectoryGroups.map(it => ({
                          name: it.name,
                          sources: this.sortThisRoleFirst(it.sourceRoles.map(role => ({role}))),
                          type: RoleMembersModel.types.DIRECTORY_GROUP,
                          error: role.errors.directoryGroups[it.name],
                          dateCreated: role.members.find(member => member.name === it.name)
                              ?.dateCreated,
                          createdBy: role.members.find(member => member.name === it.name)?.createdBy
                      }))
                    : []),

                // 3 - Roles
                ...role.effectiveRoles.map(it => ({
                    name: it.name,
                    sources: this.sortThisRoleFirst(it.sourceRoles.map(role => ({role}))),
                    type: RoleMembersModel.types.ROLE,
                    dateCreated: role.members.find(member => member.name === it.name)?.dateCreated,
                    createdBy: role.members.find(member => member.name === it.name)?.createdBy
                }))
            ]);
        } else {
            this.gridModel.loadData(
                role.inheritedRoles.map(it => ({
                    ...it,
                    sources: this.sortThisRoleFirst(it.sourceRoles.map(role => ({role}))),
                    type: RoleMembersModel.types.ROLE
                }))
            );
        }
    }

    private createGridModel(): GridModel {
        const {types} = RoleMembersModel;
        return new GridModel({
            store: {
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'error', type: 'string'},
                    {name: 'type', type: 'string'},
                    {name: 'sources', displayName: 'Assigned Via', type: 'json'}
                ],
                idSpec: data => `${this.selectedRole.name}:${data.type}:${data.name}`
            },
            contextMenu: [...this.createFilterActions(), '-', ...GridModel.defaultContextMenu],
            enableExport: true,
            exportOptions: {
                columns: ['type', 'VISIBLE'],
                filename: `${this.selectedRole.name} Members`
            },
            emptyText: 'This role has no members.',
            groupBy: 'type',
            sortBy: 'name',
            onRowDoubleClicked: ({data: record}) => {
                if (!record) return;
                const {type, name} = record.data;
                if (type === types.ROLE) this.roleModel.selectRoleAsync(name);
            },
            groupRowRenderer: this.groupRowRenderer,
            colDefaults: {
                filterable: true
            },
            columns: [
                {
                    field: 'name',
                    autosizeMaxWidth: 300,
                    renderer: this.nameRenderer,
                    rendererIsComplex: true
                },
                {
                    field: 'type',
                    exportValue: type => {
                        switch (type) {
                            case types.USER:
                                return 'User';
                            case types.DIRECTORY_GROUP:
                                return 'Directory Group';
                            case types.ROLE:
                                return 'Role';
                        }
                    },
                    hidden: true
                },
                {
                    field: 'sources',
                    flex: true,
                    minWidth: 105,
                    renderer: this.sourcesRenderer,
                    exportValue: (sources: Array<{role: string; directoryGroup?: string}>) =>
                        uniq(
                            sources.map(({role, directoryGroup}) =>
                                role === this.selectedRole.name
                                    ? directoryGroup ?? '<Direct>'
                                    : role
                            )
                        ).join(', ')
                },
                {
                    field: {name: 'dateCreated', displayName: 'Assigned', type: 'date'},
                    ...Col.dateTime
                },
                {
                    field: {name: 'createdBy', displayName: 'Assigned By', type: 'string'}
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
                    isDirectoryGroup = type === types.DIRECTORY_GROUP,
                    {moduleConfig} = this;

                if (
                    !includeEffective &&
                    ((type === types.USER && !moduleConfig.userAssignmentSupported) ||
                        (isDirectoryGroup && !moduleConfig.directoryGroupsSupported))
                ) {
                    return {hidden: true};
                }

                return {
                    text: `Roles that ${includeEffective ? 'effectively' : 'directly'} include ${
                        isDirectoryGroup ? RoleModel.fmtDirectoryGroup(name) : name
                    }`
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

    // -------------------------------
    // Grid Renderers
    // -------------------------------

    private groupRowRenderer: GroupRowRenderer = ({value}) => {
        const {USER, DIRECTORY_GROUP, ROLE} = RoleMembersModel.types;
        switch (value) {
            case USER:
                return hframe({
                    className: 'group-row-renderer',
                    items: [Icon.user(), 'Users']
                });
            case DIRECTORY_GROUP:
                return hframe({
                    className: 'group-row-renderer',
                    items: [Icon.users(), 'Directory Groups']
                });
            case ROLE:
                return hframe({
                    className: 'group-row-renderer',
                    items: [Icon.idBadge(), 'Roles']
                });
        }
    };

    private nameRenderer: ColumnRenderer = (name, {record}) => {
        const {DIRECTORY_GROUP} = RoleMembersModel.types,
            {error, type} = record.data;
        return hbox({
            alignItems: 'center',
            items: [
                box({
                    item: type === DIRECTORY_GROUP ? RoleModel.fmtDirectoryGroup(name) : name,
                    paddingRight: 'var(--xh-pad-half-px)',
                    title: name
                }),
                Icon.warning({omit: !error, intent: 'warning', title: error})
            ]
        });
    };

    private sourcesRenderer: ColumnRenderer = (
        sources: Array<{role: string; directoryGroup?: string}>
    ) =>
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
                            ? RoleModel.fmtDirectoryGroup(directoryGroup) ?? '<Direct>'
                            : role,
                        title: isThisRole ? directoryGroup ?? '<Direct>' : role,
                        minimal: true,
                        onClick: () => !isThisRole && this.roleModel.selectRoleAsync(role)
                    };
                }),
                'item'
            ).map(props => tag(props))
        });
}
