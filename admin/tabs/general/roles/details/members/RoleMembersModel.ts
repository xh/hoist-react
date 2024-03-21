/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {
    BaseMembersModel
} from '@xh/hoist/admin/tabs/general/roles/details/members/BaseMembersModel';
import {RoleDetailsModel} from '@xh/hoist/admin/tabs/general/roles/details/RoleDetailsModel';
import {RoleModel} from '@xh/hoist/admin/tabs/general/roles/RoleModel';
import {
    HoistRole,
    RoleModuleConfig
} from '@xh/hoist/admin/tabs/general/roles/Types';
import {ColumnRenderer, GridModel} from '@xh/hoist/cmp/grid';
import {box, hbox} from '@xh/hoist/cmp/layout';
import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {tag} from '@xh/hoist/kit/blueprint';
import classNames from 'classnames';
import {sortBy, uniq, uniqBy} from 'lodash';

export class RoleMembersModel extends BaseMembersModel {

    get type(): 'inherited'|'inheriting' {
        return this.componentProps.type;
    }

    override loadGridData(role: HoistRole) {
        const {gridModel, type} = this;
        if (!role) {
            gridModel.clear();
            return
        }

        const roles = type == 'inherited' ? role.inheritedRoles : role.effectiveRoles;
        gridModel.loadData(
            roles.map(it => ({
                ...it,
                sources: this.sortThisRoleFirst(it.sourceRoles.map(role => ({role}))),
            }))
        )
    }

    private createGridModel(): GridModel {
        return new GridModel({
            store: {
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'error', type: 'string'},
                    {name: 'sources', type: 'json'}
                ],
                idSpec: data => `${this.selectedRole.name}:${data.type}:${data.name}`
            },
            enableExport: true,
            exportOptions: {
                columns: ['type', 'VISIBLE'],
                filename: `${this.selectedRole.name} Members`
            },
            emptyText: 'No roles',
            sortBy: 'name',
            onRowDoubleClicked: ({data: record}) => {
                if (record) this.roleModel.selectRoleAsync(record.data.name);
            },
            colDefaults: {
                filterable: true
            },
            columns: [
                {
                    field: 'name',
                    autosizeMaxWidth: 300,
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
                }
            ]
        });
    }

    // -------------------------------
    // Grid Renderers
    // -------------------------------
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
