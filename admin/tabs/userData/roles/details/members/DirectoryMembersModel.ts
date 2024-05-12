/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {BaseMembersModel} from './BaseMembersModel';
import {RoleModel} from '../../RoleModel';
import {HoistRole} from '../../Types';
import {ColumnRenderer, GridModel} from '@xh/hoist/cmp/grid';
import {box, hbox} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {keyBy} from 'lodash';

export class DirectoryMembersModel extends BaseMembersModel {
    // -------------------------------
    // Implementation
    // -------------------------------
    override loadGridData(role: HoistRole) {
        const {gridModel} = this;

        if (!role) {
            gridModel.clear();
            return;
        }

        const memberMap = keyBy(role.members, it => `${it.name}-${it.type}`);
        gridModel.loadData(
            role.effectiveDirectoryGroups.map(it => ({
                name: it.name,
                sources: this.sortThisRoleFirst(it.sourceRoles.map(role => ({role}))),
                error: role.errors.directoryGroups[it.name],
                dateCreated: memberMap[`${it.name}-DIRECTORY_GROUP`]?.dateCreated,
                createdBy: memberMap[`${it.name}-DIRECTORY_GROUP`]?.createdBy
            }))
        );
    }

    override createGridModel(): GridModel {
        return new GridModel({
            store: {
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'error', type: 'string'},
                    {name: 'sources', type: 'json'}
                ],
                idSpec: data => `${this.selectedRole.name}:${data.name}`
            },
            enableExport: true,
            exportOptions: {
                filename: `${this.selectedRole.name} Directories`
            },
            emptyText: 'This role has no linked directories.',
            sortBy: 'name',
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
                    field: 'sources',
                    flex: true,
                    minWidth: 105,
                    renderer: this.sourcesRenderer,
                    exportValue: this.sourcesExportRenderer
                }
            ]
        });
    }

    private nameRenderer: ColumnRenderer = (name, {record}) => {
        const {error} = record.data;
        return hbox({
            alignItems: 'center',
            items: [
                box({
                    item: RoleModel.fmtDirectoryGroup(name),
                    paddingRight: 'var(--xh-pad-half-px)',
                    title: name
                }),
                Icon.warning({omit: !error, intent: 'warning', title: error})
            ]
        });
    };
}
