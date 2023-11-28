import {RoleEditorModel} from '@xh/hoist/admin/tabs/roles/editor/RoleEditorModel';
import {RoleInspectorModel} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspectorModel';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {GridModel} from '@xh/hoist/cmp/grid';
import {div, li, ul} from '@xh/hoist/cmp/layout';
import {HoistModel, HoistRole, LoadSpec, managed, ReactionSpec, XH} from '@xh/hoist/core';
import {RecordActionSpec, StoreRecord} from '@xh/hoist/data';
import {compactDateRenderer, fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {pluralize} from '@xh/hoist/utils/js';
import {compact} from 'lodash';
import moment from 'moment/moment';

export class RolesModel extends HoistModel {
    static PERSIST_WITH = {localStorageKey: 'xhAdminRolesState'};

    readonly ACTIONS: RecordActionSpec[] = this.createRecordActions();

    @managed readonly gridModel: GridModel = this.createGridModel();
    @managed readonly filterChooserModel: FilterChooserModel = this.createFilterChooserModel();
    @managed readonly roleEditorModel = new RoleEditorModel();
    @managed readonly roleInspectorModel = this.createRoleInspectorModel();

    constructor() {
        super();
        this.addReaction(this.selectedRoleReaction());
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const {data} = await XH.fetchJson({url: 'rolesAdmin/read'});
            if (loadSpec.isStale) return;
            this.gridModel.loadData(data);
            this.roleEditorModel.loadRoles(data);
        } catch (e) {
            if (loadSpec.isStale) return;
            XH.handleException(e);
            this.gridModel.clear();
            this.roleEditorModel.loadRoles([]);
        }
    }

    getRole(name: string): HoistRole {
        return this.gridModel.store.getById(name).data as HoistRole;
    }

    // -------------------------------
    // Reactions
    // -------------------------------

    private selectedRoleReaction(): ReactionSpec<StoreRecord> {
        return {
            track: () => this.gridModel.selectedRecord,
            run: record => (this.roleInspectorModel.role = record?.data as HoistRole)
        };
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    private async deleteAsync(role: HoistRole) {
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
            emptyText: 'No roles found...',
            colChooserModel: true,
            sortBy: 'name|asc',
            enableExport: true,
            exportOptions: {filename: 'roles'},
            filterModel: true,
            headerMenuDisplay: 'hover',
            groupBy: 'groupName',
            onRowDoubleClicked: ({data: record}) =>
                record &&
                this.roleEditorModel
                    .editAsync(record.data)
                    .then(role => role && this.refreshAsync()),
            persistWith: {...RolesModel.PERSIST_WITH, path: 'mainGrid'},
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
                    {name: 'inheritedRoleNames', displayName: 'Inherited Roles', type: 'json'},
                    {name: 'effectiveUserNames', displayName: 'Effective Users', type: 'json'},
                    {
                        name: 'effectiveDirectoryGroupNames',
                        displayName: 'Effective Directory Groups',
                        type: 'json'
                    },
                    {name: 'effectiveRoleNames', displayName: 'Effective Roles', type: 'json'}
                ],
                processRawData: raw => ({
                    ...raw,
                    effectiveUserNames: raw.effectiveUsers.map(it => it.name),
                    effectiveDirectoryGroupNames: raw.effectiveDirectoryGroups.map(it => it.name),
                    effectiveRoleNames: raw.effectiveRoles.map(it => it.name),
                    inheritedRoleNames: raw.inheritedRoles.map(it => it.role)
                })
            },
            colDefaults: {
                filterable: true
            },
            columns: [
                {field: {name: 'name', type: 'string'}},
                {field: {name: 'groupName', type: 'string'}, hidden: true},
                {field: {name: 'lastUpdated', type: 'date'}, renderer: compactDateRenderer()},
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
                actionFn: () =>
                    this.roleEditorModel
                        .createAsync()
                        .then(
                            role =>
                                role &&
                                this.refreshAsync().then(() =>
                                    this.gridModel.selectAsync(role.name)
                                )
                        )
            },
            {
                text: 'Edit',
                icon: Icon.edit(),
                intent: 'primary',
                actionFn: ({record}) =>
                    this.roleEditorModel
                        .editAsync(record.data as HoistRole)
                        .then(role => role && this.refreshAsync()),
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

    private createRoleInspectorModel(): RoleInspectorModel {
        return new RoleInspectorModel({
            onRoleSelected: role => this.gridModel.selectAsync(role),
            persistWith: {...RolesModel.PERSIST_WITH, path: 'roleInspector'}
        });
    }
}
