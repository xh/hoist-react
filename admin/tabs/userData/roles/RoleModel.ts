/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {GridModel, tagsRenderer, TreeStyle} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {compact, groupBy, mapValues} from 'lodash';
import moment from 'moment/moment';
import {RoleEditorModel} from './editor/RoleEditorModel';
import {HoistRole, RoleMemberType, RoleModuleConfig} from './Types';

export class RoleModel extends HoistModel {
    static PERSIST_WITH = {localStorageKey: 'xhAdminRolesState'};

    static fmtDirectoryGroup(name: string): string {
        if (!name) return name;
        const parts = name.split(','),
            cn = parts.find(it => it.toLowerCase().startsWith('cn='));
        return cn ?? name;
    }

    override persistWith = RoleModel.PERSIST_WITH;

    @managed gridModel: GridModel;
    @managed filterChooserModel: FilterChooserModel;
    @managed readonly roleEditorModel = new RoleEditorModel(this);

    @observable.ref allRoles: HoistRole[] = [];
    @observable.ref moduleConfig: RoleModuleConfig;

    @bindable groupingDisabled = false;

    get readonly() {
        return !XH.getUser().isHoistRoleManager;
    }

    get selectedRole(): HoistRole {
        const selected = this.gridModel.selectedRecord?.data;
        if (selected && !selected.isGroupRow) return selected as HoistRole;
        return null;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            await this.ensureInitializedAsync();
            if (!this.moduleConfig.enabled) return;

            const {data} = await XH.fetchJson({url: 'roleAdmin/list', loadSpec});
            if (loadSpec.isStale) return;

            this.setRoles(this.processRolesFromServer(data));
            await this.gridModel.preSelectFirstAsync();
        } catch (e) {
            if (loadSpec.isStale) return;
            XH.handleException(e);
            this.clear();
        }
    }

    async selectRoleAsync(name: string) {
        const {gridModel} = this;
        if (!gridModel.store.getById(name, true)) {
            gridModel.filterModel.clear();
            await wait();
        }
        return gridModel.selectAsync(name);
    }

    @action
    setRoles(roles: HoistRole[]) {
        const gridData = this.groupingDisabled ? roles : this.processRolesForTreeGrid(roles);
        this.allRoles = roles;
        this.gridModel.loadData(gridData);
    }

    @action
    clear() {
        this.allRoles = [];
        this.gridModel.clear();
    }

    applyMemberFilter(name: string, type: RoleMemberType, includeEffective: boolean) {
        const {gridModel} = this,
            field = this.getFieldForMemberType(type, includeEffective);
        gridModel.filterModel.setFilter({field, op: 'includes', value: name});
    }

    async deleteAsync(role: HoistRole): Promise<boolean> {
        const confirm = await XH.confirm({
            icon: Icon.warning(),
            title: 'Confirm delete?',
            message: `Are you sure you want to delete "${role.name}"? This may affect access to this applications.`,
            confirmProps: {intent: 'danger', text: 'Confirm Delete'}
        });
        if (!confirm) return false;
        await XH.fetchJson({
            url: `roleAdmin/delete/${role.name}`,
            method: 'DELETE'
        });
        this.refreshAsync();
        return true;
    }

    // -------------------------------
    // Actions
    // -------------------------------
    addAction(): RecordActionSpec {
        return {
            text: 'Add',
            icon: Icon.add(),
            intent: 'success',
            actionFn: () => this.createAsync()
        };
    }

    editAction(): RecordActionSpec {
        return {
            text: 'Edit',
            tooltip: 'Add or remove users from this role.',
            icon: Icon.edit(),
            intent: 'primary',
            displayFn: ({record}) => ({
                disabled: this.readonly || record?.data.isGroupRow
            }),
            actionFn: ({record}) => this.editAsync(record.data as HoistRole),
            recordsRequired: true
        };
    }

    cloneAction(): RecordActionSpec {
        return {
            text: 'Clone',
            icon: Icon.copy(),
            displayFn: ({record}) => ({
                disabled: this.readonly || record?.data.isGroupRow
            }),
            actionFn: ({record}) => this.createAsync(record.data as HoistRole),
            recordsRequired: true
        };
    }

    deleteAction(): RecordActionSpec {
        return {
            text: 'Delete',
            icon: Icon.delete(),
            intent: 'danger',
            displayFn: ({record}) => ({
                disabled: this.readonly || record?.data.isGroupRow
            }),
            actionFn: ({record}) =>
                this.deleteAsync(record.data as HoistRole)
                    .catchDefault()
                    .linkTo(this.loadModel),
            recordsRequired: true
        };
    }

    private groupByAction(): RecordActionSpec {
        return {
            text: 'Group By Category',
            displayFn: () => ({
                icon: this.groupingDisabled ? Icon.circle() : Icon.checkCircle(),
                disabled: this.readonly
            }),
            actionFn: ({gridModel}) => {
                this.groupingDisabled = !this.groupingDisabled;
                this.setRoles(this.allRoles);
                if (this.groupingDisabled) {
                    gridModel.showColumn('category');
                    gridModel.autosizeAsync();
                } else {
                    gridModel.hideColumn('category');
                }
            }
        };
    }
    async editAsync(role: HoistRole): Promise<void> {
        const updatedRole = await this.roleEditorModel.editAsync(role);
        if (!updatedRole) return;
        await this.refreshAsync();
    }

    // -------------------------------
    // Implementation
    // -------------------------------
    private async ensureInitializedAsync() {
        if (!this.moduleConfig) {
            const config = await XH.fetchJson({url: 'roleAdmin/config'});
            runInAction(() => {
                this.moduleConfig = config;
                if (config.enabled) {
                    this.gridModel = this.createGridModel();
                    this.filterChooserModel = this.createFilterChooserModel();
                }
            });
        }
    }

    private processRolesFromServer(
        roles: Omit<HoistRole, 'users' | 'directoryGroups' | 'roles'>[]
    ): HoistRole[] {
        return roles.map(role => {
            const membersByType = mapValues(groupBy(role.members, 'type'), members =>
                members.map(member => member.name)
            );
            return {
                ...role,
                users: membersByType['USER'] ?? [],
                directoryGroups: membersByType['DIRECTORY_GROUP'] ?? [],
                roles: membersByType['ROLE'] ?? []
            };
        });
    }

    private processRolesForTreeGrid(
        roles: Omit<HoistRole, 'users' | 'directoryGroups' | 'roles'>[]
    ) {
        const root = [];
        roles.forEach(role => {
            const categories = role.category ? role.category.split('\\') : ['Uncategorized'];

            let children = root,
                id = '';
            categories.forEach(category => {
                let currCat = children.find(it => it.name === category && it.isGroupRow);
                if (!currCat) {
                    currCat = {name: category, children: [], isGroupRow: true};
                    currCat.id = `${id}-${currCat.name}`;
                    children.push(currCat);
                }
                children = currCat.children;
                id = currCat.id;
            });
            children.push(role);
        });
        return root;
    }

    private async createAsync(roleSpec?: HoistRole): Promise<void> {
        const addedRole = await this.roleEditorModel.createAsync(roleSpec);
        if (!addedRole) return;
        await this.refreshAsync();
        await this.gridModel.selectAsync(addedRole.name);
    }

    private createGridModel(): GridModel {
        return new GridModel({
            treeMode: true,
            treeStyle: TreeStyle.HIGHLIGHTS_AND_BORDERS,
            autosizeOptions: {mode: 'managed'},
            emptyText: 'No roles found.',
            colChooserModel: true,
            sortBy: ['isGroupRow', 'name'],
            enableExport: true,
            exportOptions: {filename: 'roles'},
            filterModel: true,
            rowClassRules: {
                'xh-grid-clear-background-color': ({data}) => !data.data.isGroupRow
            },
            headerMenuDisplay: 'hover',
            onRowDoubleClicked: ({data: record}) => {
                if (!this.readonly && record && !record.data.isGroupRow) {
                    this.roleEditorModel
                        .editAsync(record.data)
                        .then(role => role && this.refreshAsync());
                }
            },
            persistWith: {...this.persistWith, path: 'mainGrid'},
            store: {
                idSpec: ({id, name}) => {
                    return id ?? name;
                },
                fields: [
                    {name: 'users', displayName: 'Assigned Users', type: 'tags'},
                    {name: 'directoryGroups', displayName: 'Assigned Groups', type: 'tags'},
                    {name: 'roles', displayName: 'Assigned Roles', type: 'tags'},
                    {name: 'inheritedRoles', type: 'json'},
                    {name: 'effectiveUsers', type: 'json'},
                    {name: 'effectiveDirectoryGroups', type: 'json'},
                    {name: 'effectiveRoles', type: 'json'},
                    {name: 'errors', type: 'json'},
                    {name: 'inheritedRoleNames', displayName: 'Inherited Roles', type: 'tags'},
                    {name: 'effectiveUserNames', displayName: 'Users', type: 'tags'},
                    {
                        name: 'effectiveDirectoryGroupNames',
                        displayName: 'Groups',
                        type: 'tags'
                    },
                    {name: 'effectiveRoleNames', displayName: 'Roles', type: 'tags'},
                    {name: 'members', type: 'json'}
                ],
                processRawData: raw => ({
                    ...raw,
                    effectiveUserNames: raw.effectiveUsers?.map(it => it.name),
                    effectiveDirectoryGroupNames: raw.effectiveDirectoryGroups?.map(it => it.name),
                    effectiveRoleNames: raw.effectiveRoles?.map(it => it.name),
                    inheritedRoleNames: raw.inheritedRoles?.map(it => it.name),
                    isGroupRow: !!raw.isGroupRow
                })
            },
            colDefaults: {
                filterable: true
            },
            columns: [
                {
                    ...actionCol,
                    actionsShowOnHoverOnly: true,
                    width: calcActionColWidth(1),
                    actions: [this.editAction()],
                    omit: this.readonly
                },
                {field: {name: 'name', type: 'string'}, isTreeColumn: true},
                {
                    field: {name: 'category', type: 'string'},
                    hidden: true,
                    renderer: v => tagsRenderer(v?.split('\\'))
                },
                {field: {name: 'lastUpdated', type: 'date'}, ...Col.dateTime, hidden: true},
                {field: {name: 'lastUpdatedBy', type: 'string'}, hidden: true},
                {field: {name: 'notes', type: 'string'}, filterable: false, flex: 1},
                {field: {name: 'isGroupRow', type: 'bool'}, hidden: true, excludeFromChooser: true}
            ],
            contextMenu: this.readonly
                ? GridModel.defaultContextMenu
                : [
                      this.addAction(),
                      this.editAction(),
                      this.cloneAction(),
                      this.deleteAction(),
                      '-',
                      this.groupByAction(),
                      ...GridModel.defaultContextMenu
                  ]
        });
    }

    private createFilterChooserModel(): FilterChooserModel {
        const config = this.moduleConfig;
        return new FilterChooserModel({
            bind: this.gridModel.store,
            fieldSpecs: compact([
                'name',
                'category',
                config.userAssignmentSupported && 'users',
                config.directoryGroupsSupported && 'directoryGroups',
                'roles',
                'inheritedRoleNames',
                'effectiveUserNames',
                config.directoryGroupsSupported && 'effectiveDirectoryGroupNames',
                'effectiveRoleNames',
                'lastUpdatedBy',
                {
                    field: 'lastUpdated',
                    example: 'YYYY-MM-DD',
                    valueParser: (v, op) => {
                        let ret = moment(v, ['YYYY-MM-DD', 'YYYYMMDD'], true);
                        if (!ret.isValid()) return null;

                        // Note special handling for '>' & '<=' queries.
                        if (['>', '<='].includes(op)) {
                            ret = moment(ret).endOf('day');
                        }

                        return ret.toDate();
                    },
                    valueRenderer: v => fmtDate(v),
                    ops: ['>', '>=', '<', '<=']
                }
            ]),
            persistWith: {...RoleModel.PERSIST_WITH, path: 'mainFilterChooser'}
        });
    }

    private getFieldForMemberType(type: RoleMemberType, effective: boolean): string {
        switch (type) {
            case 'USER':
                return effective ? 'effectiveUserNames' : 'users';
            case 'DIRECTORY_GROUP':
                return effective ? 'effectiveDirectoryGroupNames' : 'directoryGroups';
            case 'ROLE':
                return effective ? 'effectiveRoleNames' : 'roles';
        }
    }
}
