/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {RoleDetailsModel} from '../RoleDetailsModel';
import {RoleModel} from '../../RoleModel';
import {HoistRole, RoleModuleConfig} from '../../Types';
import {ColumnRenderer, GridModel, GroupRowRenderer} from '@xh/hoist/cmp/grid';
import {box, hbox, hframe} from '@xh/hoist/cmp/layout';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {tag} from '@xh/hoist/kit/blueprint';
import classNames from 'classnames';
import {keyBy, sortBy, uniq, uniqBy} from 'lodash';

export class UserMembersModel extends HoistModel {
    readonly types: Record<string, string> = {
        USER: '1-user',
        DIRECTORY_GROUP: '2-directory-group'
    };

    @lookup(() => RoleModel) readonly roleModel: RoleModel;
    @lookup(() => RoleDetailsModel) readonly roleDetailsModel: RoleDetailsModel;

    @managed gridModel: GridModel;

    get selectedRole(): HoistRole {
        return this.roleModel.selectedRole;
    }

    get moduleConfig(): RoleModuleConfig {
        return this.roleModel.moduleConfig;
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
        const {gridModel, moduleConfig, types} = this;

        if (!role) {
            gridModel.clear();
            return;
        }

        const memberMap = keyBy(role.members, it => `${it.name}-${it.type}`);
        gridModel.loadData([
            // 1 - Users
            ...role.effectiveUsers.map(it => ({
                name: it.name,
                sources: this.sortThisRoleFirst(it.sources),
                type: types.USER,
                dateCreated: memberMap[`${it.name}-USER`]?.dateCreated,
                createdBy: memberMap[`${it.name}-USER`]?.createdBy
            })),

            // 2 - Directory Groups
            ...(moduleConfig?.directoryGroupsSupported
                ? role.effectiveDirectoryGroups.map(it => ({
                      name: it.name,
                      sources: this.sortThisRoleFirst(it.sourceRoles.map(role => ({role}))),
                      type: types.DIRECTORY_GROUP,
                      error: role.errors.directoryGroups[it.name],
                      dateCreated: memberMap[`${it.name}-DIRECTORY_GROUP`]?.dateCreated,
                      createdBy: memberMap[`${it.name}-DIRECTORY_GROUP`]?.createdBy
                  }))
                : [])
        ]);
    }

    private createGridModel(): GridModel {
        return new GridModel({
            store: {
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'error', type: 'string'},
                    {name: 'type', type: 'string'},
                    {name: 'sources', type: 'json'}
                ],
                idSpec: data => `${this.selectedRole.name}:${data.type}:${data.name}`
            },
            enableExport: true,
            exportOptions: {
                columns: ['type', 'VISIBLE'],
                filename: `${this.selectedRole.name} Members`
            },
            emptyText: 'This role has no effective users.',
            groupBy: 'type',
            sortBy: 'name',
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
                    exportValue: it => (it = this.types.USER ? 'User' : 'Directory Group'),
                    hidden: true
                },
                {
                    field: 'sources',
                    flex: true,
                    minWidth: 105,
                    renderer: this.sourcesRenderer,
                    exportValue: this.sourcesExportRenderer
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

    // -------------------------------
    // Grid Renderers
    // -------------------------------
    private groupRowRenderer: GroupRowRenderer = ({value}) => {
        const {USER, DIRECTORY_GROUP} = this.types;
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
        }
    };

    private nameRenderer: ColumnRenderer = (name, {record}) => {
        const {DIRECTORY_GROUP} = this.types,
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

    private sourcesExportRenderer: ColumnRenderer = (
        sources: Array<{role: string; directoryGroup?: string}>
    ) =>
        uniq(
            sources.map(({role, directoryGroup}) =>
                role === this.selectedRole.name ? directoryGroup ?? '<Direct>' : role
            )
        ).join(', ');
}
