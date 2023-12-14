import {RoleEditorModel} from '@xh/hoist/admin/tabs/roles/editor/RoleEditorModel';
import {HoistRole} from '@xh/hoist/admin/tabs/roles/HoistRole';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {div, li, ul} from '@xh/hoist/cmp/layout';
import {HoistModel, LoadSpec, managed, persist, ReactionSpec, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {compact, groupBy, mapValues} from 'lodash';
import {action, observable} from 'mobx';
import moment from 'moment/moment';

export class RolesModel extends HoistModel {
    static PERSIST_WITH = {localStorageKey: 'xhAdminRolesState'};

    override persistWith = RolesModel.PERSIST_WITH;

    readonly ACTIONS: RecordActionSpec[] = this.createRecordActions();

    @managed readonly gridModel: GridModel = this.createGridModel();
    @managed readonly filterChooserModel: FilterChooserModel = this.createFilterChooserModel();
    @managed readonly roleEditorModel = new RoleEditorModel(this);

    @observable.ref allRoles: HoistRole[] = [];

    @bindable @persist groupByCategory = true;

    get selectedRole(): HoistRole {
        return this.gridModel.selectedRecord?.data as HoistRole;
    }

    constructor() {
        super();
        makeObservable(this);
        this.addReaction(this.groupByCategoryReaction());
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
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

    selectRole(name: string) {
        this.gridModel.selectAsync(name);
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

    // -------------------------------
    // Reactions
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

    async deleteAsync(role: HoistRole): Promise<boolean> {
        const {effectiveUsers, effectiveDirectoryGroups, effectiveRoles} = role,
            userCount = effectiveUsers.length,
            groupCount = effectiveDirectoryGroups.length,
            roleCount = effectiveRoles.length;

        if (userCount || groupCount || roleCount) {
            const confirm = await XH.confirm({
                icon: Icon.warning(),
                title: 'Confirm delete?',
                message: div(
                    'Deleting this role will affect:',
                    ul(
                        compact([
                            userCount && pluralize('user', userCount, true),
                            groupCount && pluralize('group', groupCount, true),
                            roleCount && pluralize('role', roleCount, true)
                        ]).map(it => li(it))
                    ),
                    'Are you sure you wish to continue?'
                ),
                confirmProps: {intent: 'danger', text: 'Confirm Delete'}
            });
            if (!confirm) return false;
        }
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
            headerMenuDisplay: 'hover',
            onRowDoubleClicked: ({data: record}) =>
                record &&
                this.roleEditorModel
                    .editAsync(record.data)
                    .then(role => role && this.refreshAsync()),
            persistWith: {...this.persistWith, path: 'mainGrid'},
            store: {
                idSpec: 'name',
                fields: [
                    {name: 'users', type: 'tags'},
                    {name: 'directoryGroups', type: 'tags'},
                    {name: 'roles', type: 'tags'},
                    {name: 'inheritedRoles', type: 'json'},
                    {name: 'effectiveUsers', type: 'json'},
                    {name: 'effectiveDirectoryGroups', type: 'json'},
                    {name: 'effectiveRoles', type: 'json'},
                    {name: 'inheritedRoleNames', displayName: 'Inherited Roles', type: 'tags'},
                    {name: 'effectiveUserNames', displayName: 'Effective Users', type: 'tags'},
                    {
                        name: 'effectiveDirectoryGroupNames',
                        displayName: 'Effective Directory Groups',
                        type: 'tags'
                    },
                    {name: 'effectiveRoleNames', displayName: 'Effective Roles', type: 'tags'},
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
                {field: {name: 'lastUpdated', type: 'date'}, ...Col.dateTime},
                {field: {name: 'lastUpdatedBy', type: 'string'}},
                {field: {name: 'notes', type: 'string'}, filterable: false, flex: 1}
            ],
            contextMenu: [...this.ACTIONS, '-', ...GridModel.defaultContextMenu]
        });
    }

    private createRecordActions(): RecordActionSpec[] {
        return [
            {
                text: 'Add',
                icon: Icon.add(),
                intent: 'success',
                actionFn: () => this.createAsync()
            },
            {
                text: 'Edit',
                icon: Icon.edit(),
                intent: 'primary',
                actionFn: ({record}) => this.editAsync(record.data as HoistRole),
                recordsRequired: true
            },
            {
                text: 'Clone',
                icon: Icon.copy(),
                actionFn: ({record}) => this.createAsync(record.data as HoistRole),
                recordsRequired: true
            },
            {
                text: 'Delete',
                icon: Icon.delete(),
                intent: 'danger',
                actionFn: ({record}) =>
                    this.deleteAsync(record.data as HoistRole)
                        .catchDefault()
                        .linkTo(this.loadModel),
                recordsRequired: true
            }
        ];
    }

    private createFilterChooserModel(): FilterChooserModel {
        return new FilterChooserModel({
            bind: this.gridModel.store,
            fieldSpecs: [
                'name',
                'category',
                'users',
                'directoryGroups',
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
            ],
            persistWith: {...RolesModel.PERSIST_WITH, path: 'mainFilterChooser'}
        });
    }
}
