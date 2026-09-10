/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {getAppModel} from '@xh/hoist/admin/AdminUtils';
import {RecategorizeDialogModel} from '@xh/hoist/admin/tabs/userData/roles/recategorize/RecategorizeDialogModel';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {GridModel, tagsRenderer, TreeStyle} from '@xh/hoist/cmp/grid';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {fragment, p} from '@xh/hoist/cmp/layout';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {compact, groupBy, isEmpty, isString, mapValues, uniq} from 'lodash';
import {RoleEditorModel} from './editor/RoleEditorModel';
import {DirectoryGroupInfo, HoistRole, RoleModuleConfig} from './Types';

export class RoleModel extends HoistModel {
    override telemetryPrefix = 'xh.client.admin.roles';

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
    @managed recategorizeDialogModel = new RecategorizeDialogModel(this);

    @observable.ref allRoles: HoistRole[] = [];

    /**
     * Display info for directory groups, keyed by the identifier stored on the role. Values are
     * either a resolved {@link DirectoryGroupInfo} or a string describing a lookup error.
     * Loaded via `roleAdmin/directoryGroupsInfo` after each load of the role list. (observable)
     */
    @observable.ref directoryGroupInfo: Record<string, DirectoryGroupInfo | string> = {};

    /**
     * Set to false if the server 404s the `directoryGroupsInfo` endpoint (i.e. app on an older
     * hoist-core), to avoid re-requesting and re-logging on every role list refresh.
     */
    directoryGroupInfoAvailable = true;

    @bindable showInGroups = true;

    /** Role-module config - loaded at init. */
    get moduleConfig(): RoleModuleConfig {
        return getAppModel().roleModuleConfig;
    }

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

        this.gridModel = this.createGridModel();
        this.filterChooserModel = this.createFilterChooserModel();

        this.addReaction({
            track: () => this.showInGroups,
            run: showInGroups => {
                const {gridModel} = this;
                if (showInGroups) {
                    gridModel.hideColumn('category');
                } else {
                    gridModel.showColumn('category');
                }
                this.displayRoles();
            }
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        return this.runner({loadSpec})
            .span('list')
            .run(async ctx => {
                const {data} = await XH.fetchJson({url: 'roleAdmin/list'}, ctx);

                runInAction(() => {
                    this.allRoles = this.processRolesFromServer(data);
                });
                this.displayRoles(loadSpec.isRefresh);
                this.loadDirectoryGroupInfoAsync();
                await this.gridModel.preSelectFirstAsync();
            });
    }

    override handleLoadException(e: unknown) {
        XH.handleException(e);
        this.clear();
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
    clear() {
        this.allRoles = [];
        this.gridModel.clear();
    }

    /** Resolved display info for a directory group, or null if unresolved or lookup failed. */
    getDirectoryGroupInfo(name: string): DirectoryGroupInfo {
        const info = this.directoryGroupInfo[name];
        return isString(info) ? null : (info ?? null);
    }

    /** Friendly display name for a directory group, with fallback formatting if unresolved. */
    getDirectoryGroupDisplayName(name: string): string {
        return this.getDirectoryGroupInfo(name)?.displayName ?? RoleModel.fmtDirectoryGroup(name);
    }

    /** Description of any error encountered resolving display info for a directory group. */
    getDirectoryGroupLookupError(name: string): string {
        const info = this.directoryGroupInfo[name];
        return isString(info) ? info : null;
    }

    /** Merge additional entries into the directory group display info cache. */
    @action
    updateDirectoryGroupInfo(updates: Record<string, DirectoryGroupInfo | string>) {
        if (isEmpty(updates)) return;
        this.directoryGroupInfo = {...this.directoryGroupInfo, ...updates};
    }

    async createAsync(roleSpec?: HoistRole): Promise<void> {
        if (this.readonly) return;

        const addedRole = await this.roleEditorModel.createAsync(roleSpec);
        if (!addedRole) return;
        await this.refreshAsync();
        await this.gridModel.selectAsync(addedRole.name);
    }

    async editAsync(role: HoistRole): Promise<void> {
        if (this.readonly) return;

        const updatedRole = await this.roleEditorModel.editAsync(role);
        if (!updatedRole) return;
        await this.refreshAsync();
    }

    async deleteAsync(role: HoistRole): Promise<boolean> {
        if (this.readonly) return false;

        const confirm = await XH.confirm({
            message: fragment(
                p(`Are you sure you want to delete the ${role.name} role?`),
                p(`This may impact access to this application.`)
            ),
            extraConfirmText: role.name,
            confirmProps: {
                text: 'Delete role',
                intent: 'danger',
                outlined: true,
                autoFocus: false
            }
        });
        if (!confirm) return false;

        await this.runner()
            .span('delete')
            .deleteJson({
                url: `roleAdmin/delete`,
                body: {name: role.name}
            });
        await this.refreshAsync();
        return true;
    }

    //------------------
    // Actions
    //------------------
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
                disabled: !record || record.data.isGroupRow
            }),
            actionFn: ({record}) => this.editAsync(record.data as HoistRole),
            recordsRequired: 1
        };
    }

    private cloneAction(): RecordActionSpec {
        return {
            text: 'Clone',
            icon: Icon.copy(),
            displayFn: ({record}) => ({
                disabled: !record || record.data.isGroupRow
            }),
            actionFn: ({record}) => this.createAsync(record.data as HoistRole),
            recordsRequired: 1
        };
    }

    private deleteAction(): RecordActionSpec {
        return {
            text: 'Delete',
            icon: Icon.delete(),
            intent: 'danger',
            displayFn: ({record}) => ({
                disabled: !record || record.data.isGroupRow
            }),
            actionFn: ({record}) =>
                this.deleteAsync(record.data as HoistRole)
                    .catchDefault()
                    .linkTo(this.loadObserver),
            recordsRequired: 1
        };
    }

    private groupByAction(): RecordActionSpec {
        return {
            text: 'Group By Category',
            icon: Icon.treeList(),
            displayFn: () => ({
                text: this.showInGroups ? 'Ungroup Grid' : 'Group by Category'
            }),
            actionFn: () => {
                this.showInGroups = !this.showInGroups;
            }
        };
    }

    //------------------
    // Implementation
    //------------------
    private displayRoles(isRefresh?: boolean) {
        const {gridModel} = this,
            gridData = this.showInGroups
                ? this.processRolesForTreeGrid(this.allRoles)
                : this.allRoles;
        gridModel.loadData(gridData);
        if (!isRefresh) gridModel.expandAll();
        gridModel.autosizeAsync({includeCollapsedChildren: true});
    }

    private async loadDirectoryGroupInfoAsync() {
        const names = uniq(this.allRoles.flatMap(it => it.directoryGroups));
        if (
            isEmpty(names) ||
            !this.moduleConfig.directoryGroupsSupported ||
            !this.directoryGroupInfoAvailable
        ) {
            return;
        }
        try {
            const {data} = await this.runner()
                .span('directoryGroupsInfo')
                .fetchJson({url: 'roleAdmin/directoryGroupsInfo', params: {names}});
            this.updateDirectoryGroupInfo(data);
        } catch (e) {
            if (e?.httpStatus === 404) {
                this.directoryGroupInfoAvailable = false;
                this.logWarn(
                    'Server does not support directory group display info - will show raw identifiers',
                    e
                );
            } else {
                this.logError('Failed to resolve directory group display info', e);
            }
        }
    }

    private processRolesFromServer(roles: Partial<HoistRole>[]): HoistRole[] {
        return roles.map(role => {
            const membersByType = mapValues(groupBy(role.members, 'type'), members =>
                members.map(member => member.name)
            );
            return {
                ...role,
                users: membersByType['USER'] ?? [],
                directoryGroups: membersByType['DIRECTORY_GROUP'] ?? [],
                roles: membersByType['ROLE'] ?? []
            } as HoistRole;
        });
    }

    private processRolesForTreeGrid(roles: HoistRole[]) {
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

    private createGridModel(): GridModel {
        return new GridModel({
            treeMode: true,
            treeStyle: TreeStyle.HIGHLIGHTS_AND_BORDERS,
            autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
            selModel: 'multiple',
            emptyText: 'No roles found.',
            colChooserModel: true,
            sortBy: 'name',
            enableExport: true,
            exportOptions: {filename: 'roles'},
            filterModel: true,
            rowClassRules: {
                'xh-grid-clear-background-color': ({data}) => !data.data.isGroupRow
            },
            headerMenuDisplay: 'hover',
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
                    {name: 'isGroupRow', type: 'bool'},
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
                    excludeFromChooser: true,
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
                {field: {name: 'notes', type: 'string'}, filterable: false, flex: 1}
            ],
            contextMenu: () => this.getContextMenuItems(),
            onRowDoubleClicked: ({data: record}) => {
                if (record && !record.data.isGroupRow) {
                    this.editAsync(record.data as HoistRole);
                }
            }
        });
    }

    private getContextMenuItems() {
        return this.readonly
            ? [this.groupByAction(), '-', ...GridModel.defaults.contextMenu]
            : [
                  this.addAction(),
                  this.editAction(),
                  this.cloneAction(),
                  this.deleteAction(),
                  '-',
                  this.recategorizeDialogModel.recategorizeAction(),
                  '-',
                  this.groupByAction(),
                  '-',
                  ...GridModel.defaults.contextMenu
              ];
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
                'lastUpdated'
            ]),
            persistWith: {...RoleModel.PERSIST_WITH, path: 'mainFilterChooser'}
        });
    }
}
