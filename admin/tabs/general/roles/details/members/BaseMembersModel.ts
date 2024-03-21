/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {RoleDetailsModel} from '@xh/hoist/admin/tabs/general/roles/details/RoleDetailsModel';
import {RoleModel} from '@xh/hoist/admin/tabs/general/roles/RoleModel';
import {
    HoistRole,
    RoleModuleConfig
} from '@xh/hoist/admin/tabs/general/roles/Types';
import {ColumnRenderer, GridModel} from '@xh/hoist/cmp/grid';
import {hbox } from '@xh/hoist/cmp/layout';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {tag} from '@xh/hoist/kit/blueprint';
import classNames from 'classnames';
import {sortBy, uniq, uniqBy} from 'lodash';

export abstract class BaseMembersModel extends HoistModel {

    readonly types: Record<string, string> = {
        USER: '1-user',
        DIRECTORY_GROUP: '2-directory-group',
        ROLE: '3-role'
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

    abstract loadGridData(role: HoistRole);

    abstract createGridModel(): GridModel;

    protected sortThisRoleFirst<T extends { role: string; directoryGroup?: string }>(
        sources: T[]
    ): T[] {
        sources = sortBy(sources, source => `${source.role}:${source.directoryGroup ?? ''}`);
        const thisRole = sources.filter(it => it.role === this.selectedRole.name) ?? [];
        return [...thisRole, ...sources.filter(it => it.role !== this.selectedRole.name)];
    }

    // -------------------------------
    // Grid Renderers
    // -------------------------------
    protected sourcesRenderer: ColumnRenderer = (
        sources: Array<{ role: string; directoryGroup?: string }>
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

    protected sourcesExportRenderer: ColumnRenderer = (
        sources: Array<{ role: string; directoryGroup?: string }>
    ) =>
        uniq(
            sources.map(({role, directoryGroup}) =>
                role === this.selectedRole.name
                    ? directoryGroup ?? '<Direct>'
                    : role
            )
        ).join(', ');
}