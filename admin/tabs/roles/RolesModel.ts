import {RoleEditorModel} from '@xh/hoist/admin/tabs/roles/editor/RoleEditorModel';
import {RoleInspectorModel} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspectorModel';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {GridModel} from '@xh/hoist/cmp/grid';
import {div, li, ul} from '@xh/hoist/cmp/layout';
import {HoistModel, HoistRole, LoadSpec, managed, ReactionSpec, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
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

    private selectedRoleReaction(): ReactionSpec<string> {
        const {gridModel} = this;
        return {
            track: () => {
                const {selectedRecord} = gridModel;
                if (!selectedRecord) return null;
                // Only fire when record has been modified or selection has changed
                return [selectedRecord.id, selectedRecord.get('lastUpdated')].join('::');
            },
            run: () => (this.roleInspectorModel.role = gridModel.selectedRecord?.data as HoistRole)
        };
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    private async deleteAsync(role: HoistRole) {
        const {allUsers, allDirectoryGroups, inheritedBy} = role,
            userCount = allUsers.length,
            groupCount = allDirectoryGroups.length,
            roleCount = inheritedBy.length;

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
                    {name: 'inherits', displayName: 'Directly Inherits', type: 'tags'},
                    {name: 'allInheritedRoleNames', displayName: 'Inherits', type: 'tags'},
                    {name: 'users', displayName: 'Direct Users', type: 'tags'},
                    {name: 'directoryGroups', displayName: 'Direct Groups', type: 'tags'},
                    {name: 'inheritedBy', type: 'tags'},
                    {name: 'indirectlyInheritedBy', type: 'tags'},
                    {name: 'directlyInheritedBy', type: 'tags'},
                    {name: 'allUsers', type: 'json'},
                    {name: 'allUserNames', displayName: 'Users', type: 'tags'},
                    {name: 'allDirectoryGroupNames', displayName: 'Groups', type: 'tags'},
                    {name: 'allDirectoryGroups', type: 'json'},
                    {name: 'allInheritedRoles', type: 'json'},
                    {name: 'inheritanceMap', type: 'json'},
                    {name: 'undeletable', type: 'bool'}
                ],
                processRawData: raw => ({
                    ...raw,
                    allInheritedRoleNames: raw.allInheritedRoles.map(it => it.role),
                    allUserNames: raw.allUsers.map(it => it.name),
                    allDirectoryGroupNames: raw.allDirectoryGroups.map(it => it.name)
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
                'allInheritedRoleNames',
                'inherits',
                'inheritedBy',
                'directlyInheritedBy',
                'allUserNames',
                'allDirectoryGroupNames',
                'users',
                'directoryGroups',
                'name',
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
