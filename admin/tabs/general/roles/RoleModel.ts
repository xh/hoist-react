import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {HoistModel, LoadSpec, managed, persist, ReactionSpec, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {compact, groupBy, mapValues} from 'lodash';
import {action, observable} from 'mobx';
import moment from 'moment/moment';
import {RoleEditorModel} from './editor/RoleEditorModel';
import {HoistRole, RoleMemberType, RoleServiceConfig} from './Types';

export class RoleModel extends HoistModel {
    static PERSIST_WITH = {localStorageKey: 'xhAdminRolesState'};

    override persistWith = RoleModel.PERSIST_WITH;

    @managed readonly gridModel: GridModel = this.createGridModel();
    @managed readonly filterChooserModel: FilterChooserModel = this.createFilterChooserModel();
    @managed readonly roleEditorModel = new RoleEditorModel(this);

    @observable.ref allRoles: HoistRole[] = [];

    @bindable @persist groupByCategory = true;

    get readonly() {
        return !XH.getUser().isHoistRoleManager;
    }

    get selectedRole(): HoistRole {
        return this.gridModel.selectedRecord?.data as HoistRole;
    }

    get softConfig(): RoleServiceConfig {
        return XH.getConf('xhRoleModuleConfig');
    }

    constructor() {
        super();
        makeObservable(this);
        this.addReaction(this.groupByCategoryReaction());
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        if (!this.softConfig?.enabled) return;
        try {
            const {data} = await XH.fetchJson({loadSpec, url: 'roleAdmin/list'});
            if (loadSpec.isStale) return;
            this.setRoles(this.processRolesFromServer(data));
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
        this.allRoles = roles;
        this.gridModel.loadData(roles);
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
            icon: Icon.edit(),
            intent: 'primary',
            actionFn: ({record}) => this.editAsync(record.data as HoistRole),
            recordsRequired: true
        };
    }

    cloneAction(): RecordActionSpec {
        return {
            text: 'Clone',
            icon: Icon.copy(),
            actionFn: ({record}) => this.createAsync(record.data as HoistRole),
            recordsRequired: true
        };
    }

    deleteAction(): RecordActionSpec {
        return {
            text: 'Delete',
            icon: Icon.delete(),
            intent: 'danger',
            actionFn: ({record}) =>
                this.deleteAsync(record.data as HoistRole)
                    .catchDefault()
                    .linkTo(this.loadModel),
            recordsRequired: true
        };
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
    // Implementation
    // -------------------------------
    private groupByCategoryReaction(): ReactionSpec<boolean> {
        const {gridModel} = this;
        return {
            track: () => this.groupByCategory,
            run: groupByCategory => {
                gridModel.setGroupBy(groupByCategory ? 'category' : null);
                gridModel.setColumnVisible('category', !groupByCategory);
                gridModel.autosizeAsync();
            },
            fireImmediately: true
        };
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

    private async createAsync(roleSpec?: HoistRole): Promise<void> {
        const addedRole = await this.roleEditorModel.createAsync(roleSpec);
        if (!addedRole) return;
        await this.refreshAsync();
        await this.gridModel.selectAsync(addedRole.name);
    }

    private async editAsync(role: HoistRole): Promise<void> {
        const updatedRole = await this.roleEditorModel.editAsync(role);
        if (!updatedRole) return;
        await this.refreshAsync();
    }

    private createGridModel(): GridModel {
        return new GridModel({
            autosizeOptions: {mode: 'managed'},
            emptyText: 'No roles found.',
            colChooserModel: true,
            sortBy: 'name|asc',
            enableExport: true,
            exportOptions: {filename: 'roles'},
            filterModel: true,
            groupRowRenderer: ({value}) => (!value ? 'Uncategorized' : value),
            headerMenuDisplay: 'hover',
            onRowDoubleClicked: ({data: record}) =>
                !this.readonly &&
                record &&
                this.roleEditorModel
                    .editAsync(record.data)
                    .then(role => role && this.refreshAsync()),
            persistWith: {...this.persistWith, path: 'mainGrid'},
            store: {
                idSpec: 'name',
                fields: [
                    {name: 'users', displayName: 'Assigned Users', type: 'tags'},
                    {name: 'directoryGroups', displayName: 'Assigned Groups', type: 'tags'},
                    {name: 'roles', displayName: 'Assigned Roles', type: 'tags'},
                    {name: 'inheritedRoles', type: 'json'},
                    {name: 'effectiveUsers', type: 'json'},
                    {name: 'effectiveDirectoryGroups', type: 'json'},
                    {name: 'effectiveRoles', type: 'json'},
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
                    effectiveUserNames: raw.effectiveUsers.map(it => it.name),
                    effectiveDirectoryGroupNames: raw.effectiveDirectoryGroups.map(it => it.name),
                    effectiveRoleNames: raw.effectiveRoles.map(it => it.name),
                    inheritedRoleNames: raw.inheritedRoles.map(it => it.name)
                })
            },
            colDefaults: {
                filterable: true
            },
            columns: [
                {field: {name: 'name', type: 'string'}},
                {field: {name: 'category', type: 'string'}},
                {field: {name: 'lastUpdated', type: 'date'}, ...Col.dateTime, hidden: true},
                {field: {name: 'lastUpdatedBy', type: 'string'}, hidden: true},
                {field: {name: 'notes', type: 'string'}, filterable: false, flex: 1}
            ],
            contextMenu: this.readonly
                ? GridModel.defaultContextMenu
                : [
                      this.addAction(),
                      this.editAction(),
                      this.cloneAction(),
                      this.deleteAction(),
                      '-',
                      ...GridModel.defaultContextMenu
                  ]
        });
    }

    private createFilterChooserModel(): FilterChooserModel {
        const {softConfig} = this;
        return new FilterChooserModel({
            bind: this.gridModel.store,
            fieldSpecs: compact([
                'name',
                'category',
                softConfig.assignUsers && 'users',
                softConfig.assignDirectoryGroups && 'directoryGroups',
                'roles',
                'inheritedRoleNames',
                'effectiveUserNames',
                'effectiveDirectoryGroupNames',
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
