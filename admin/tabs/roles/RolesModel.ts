import {RoleEditorModel} from '@xh/hoist/admin/tabs/roles/editor/RoleEditorModel';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {GridModel} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {div, fragment, hbox, hspacer, li, ul} from '@xh/hoist/cmp/layout';
import {HoistModel, HoistRole, LoadSpec, managed, persist, ReactionSpec, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {compact, max} from 'lodash';
import {action, observable} from 'mobx';
import moment from 'moment/moment';

export class RolesModel extends HoistModel {
    static PERSIST_WITH = {localStorageKey: 'xhAdminRolesState'};

    override persistWith = RolesModel.PERSIST_WITH;

    readonly ACTIONS: RecordActionSpec[] = this.createRecordActions();

    @managed readonly gridModel: GridModel = this.createGridModel();
    @managed readonly filterChooserModel: FilterChooserModel = this.createFilterChooserModel();
    @managed readonly roleEditorModel = new RoleEditorModel();

    @observable.ref allRoles: HoistRole[] = [];
    @observable.ref selectedRole?: HoistRole;

    @bindable @persist groupByCategory = true;

    constructor() {
        super();
        makeObservable(this);
        this.addReaction(this.selectedRoleReaction(), this.groupByCategoryReaction());
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const {data} = await XH.fetchJson({url: 'rolesAdmin/read'});
            if (loadSpec.isStale) return;
            this.setRoles(data);
            this.gridModel.loadData(data);
            this.roleEditorModel.loadRoles(data);
        } catch (e) {
            if (loadSpec.isStale) return;
            XH.handleException(e);
            this.gridModel.clear();
            this.roleEditorModel.loadRoles([]);
        }
    }

    selectRole(name: string) {
        this.gridModel.selectAsync(name);
    }

    @action
    setRoles(roles: HoistRole[]) {
        // Avoid unnecessary re-renders caused by mutating observable when data is unchanged.
        if (
            roles.length !== this.allRoles.length ||
            max(roles.map(it => it.lastUpdated)) > max(this.allRoles.map(it => it.lastUpdated))
        ) {
            this.allRoles = roles;
        }
    }

    // -------------------------------
    // Reactions
    // -------------------------------

    private selectedRoleReaction(): ReactionSpec<string> {
        const {gridModel} = this;
        return {
            track: () => {
                const {selectedRecord} = gridModel;
                if (!selectedRecord) return null;
                // Only fire when record has been modified or selection has changed
                return [selectedRecord.id, selectedRecord.get('lastUpdated')].join('::');
            },
            run: () => (this.selectedRole = gridModel.selectedRecord?.data as HoistRole)
        };
    }

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

    // -------------------------------
    // Implementation
    // -------------------------------

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

    private async deleteAsync(role: HoistRole): Promise<void> {
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
            if (!confirm) return;
        }
        return XH.fetchJson({
            url: `rolesAdmin/delete/${role.name}`,
            method: 'DELETE'
        })
            .then(() => this.refreshAsync())
            .catchDefault()
            .linkTo(this.loadModel);
    }

    private createGridModel(): GridModel {
        return new GridModel({
            autosizeOptions: {mode: 'managed'},
            emptyText: 'No roles found...',
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
                    {name: 'members', type: 'json'},
                    {name: 'undeletable', type: 'bool'}
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
                {
                    field: {name: 'name', type: 'string'},
                    renderer: (v, {record}) =>
                        hbox({
                            alignItems: 'center',
                            items: [
                                fragment({
                                    items: [Icon.pin({title: 'Not Deletable'}), hspacer()],
                                    omit: !record.get('undeletable')
                                }),
                                v
                            ]
                        })
                },
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
                text: 'Duplicate',
                icon: Icon.copy(),
                intent: 'success',
                actionFn: ({record}) => this.createAsync(record.data as HoistRole),
                recordsRequired: true
            },
            {
                text: 'Edit',
                icon: Icon.edit(),
                intent: 'primary',
                actionFn: ({record}) => this.editAsync(record.data as HoistRole),
                recordsRequired: true
            },
            {
                text: 'Delete',
                icon: Icon.delete(),
                intent: 'danger',
                actionFn: ({record}) => this.deleteAsync(record.data as HoistRole),
                displayFn: ({record}) => ({
                    disabled: !record || record.data.undeletable
                })
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
