/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {RowDoubleClickedEvent} from '@xh/hoist/kit/ag-grid';
import {ColumnRenderer, GridModel} from '@xh/hoist/cmp/grid';
import {hbox} from '@xh/hoist/cmp/layout';
import {HoistModel, lookup, managed, PlainObject} from '@xh/hoist/core';
import {tag} from '@xh/hoist/kit/blueprint';
import classNames from 'classnames';
import {partition, sortBy, uniq} from 'lodash';
import {ReactNode} from 'react';
import {RoleModel} from '../../RoleModel';
import {HoistRole, RoleModuleConfig} from '../../Types';
import {RoleDetailsModel} from '../RoleDetailsModel';

export abstract class BaseMembersModel extends HoistModel {
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
        this.addReaction(
            {
                track: () => this.selectedRole,
                run: role => this.loadGridData(role),
                fireImmediately: true
            },
            {
                track: () => this.emptyText,
                run: emptyText => (this.gridModel.emptyText = emptyText)
            }
        );
    }

    //---------------------------------
    // Overrideable properties/methods
    //---------------------------------
    protected entityName: string = 'members';

    abstract getGridData(role: HoistRole): PlainObject[];

    protected get emptyText(): ReactNode {
        return 'No members.';
    }

    protected sourceList(sources: string[]): string[] {
        const [thisRole, otherRoles] = partition(uniq(sources), it => it != this.selectedRole.name);
        return [...thisRole, ...sortBy(otherRoles)];
    }

    protected nameRenderer: ColumnRenderer = name => {
        return name;
    };

    protected sourcesRenderer: ColumnRenderer = (sources: string[]) => {
        return hbox({
            className: 'roles-renderer',
            items: sources.map(role => {
                const isThisRole = role === this.selectedRole.name;
                return tag({
                    className: classNames(
                        'roles-renderer__role',
                        !isThisRole && 'roles-renderer__role--effective'
                    ),
                    minimal: true,
                    item: isThisRole ? '<Direct>' : role,
                    onDoubleClick: isThisRole ? null : () => this.roleModel.selectRoleAsync(role)
                });
            })
        });
    };

    protected sourcesExportRenderer: ColumnRenderer = (sources: string[]) => {
        return sources
            .map(role => {
                return role === this.selectedRole.name ? '<Direct>' : role;
            })
            .join(', ');
    };

    protected onRowDoubleClicked: (e: RowDoubleClickedEvent) => void = null;

    //-----------------
    // Implementation
    //-----------------
    private createGridModel(): GridModel {
        const {entityName} = this;
        return new GridModel({
            store: {
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'sources', type: 'json'},
                    {name: 'error', type: 'string'}, // For directory groups
                    {name: 'dateCreated', type: 'date'}, // For direct members
                    {name: 'createdBy', type: 'string'} // For direct members
                ],
                idSpec: data => `${this.selectedRole.name}:${data.name}`
            },
            enableExport: true,
            exportOptions: {filename: () => `${this.selectedRole.name}-${entityName}`},
            emptyText: this.emptyText,
            sortBy: 'name',
            columns: [
                {
                    field: 'name',
                    autosizeMaxWidth: 300
                },
                {
                    field: 'sources',
                    sortValue: this.sourcesExportRenderer,
                    flex: true,
                    minWidth: 105,
                    renderer: this.sourcesRenderer,
                    exportValue: this.sourcesExportRenderer
                }
            ],
            onRowDoubleClicked: this.onRowDoubleClicked
        });
    }

    private loadGridData(role: HoistRole) {
        const data = role ? this.getGridData(role) : [];
        this.gridModel.loadData(data);
    }
}
