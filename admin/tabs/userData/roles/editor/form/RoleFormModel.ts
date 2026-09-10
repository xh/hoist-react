/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {box, hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {
    HoistModel,
    managed,
    PlainObject,
    ReactionSpec,
    SelectOption,
    TaskObserver,
    XH
} from '@xh/hoist/core';
import {RecordActionSpec, required} from '@xh/hoist/data';
import {actionCol, calcActionColWidth, selectEditor} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {action, computed, observable} from '@xh/hoist/mobx';
import {compact, groupBy, isNil, isString, keyBy, map, sortBy, uniq, without} from 'lodash';
import {ReactNode} from 'react';
import {RoleModel} from '../../RoleModel';
import {DirectoryGroupInfo, HoistRole, RoleMemberType, RoleModuleConfig} from '../../Types';

export class RoleFormModel extends HoistModel {
    override telemetryPrefix = 'xh.client.admin.roles';

    /** Minimum query length before the directory group picker searches the directory itself. */
    static SEARCH_MIN_CHARS = 2;

    readonly ADD_ASSIGNMENT_ACTION: RecordActionSpec = this.createAddAssigmentAction();
    readonly ACTIONS: RecordActionSpec[] = [
        this.ADD_ASSIGNMENT_ACTION,
        this.createRemoveAssignmentAction()
    ];
    readonly directoryGroupLookupTask = TaskObserver.trackLast();
    readonly roleModel: RoleModel;

    @observable accessor isEditingExistingRole = false;

    @observable.ref accessor invalidNames: string[] = [];
    @observable.ref accessor categoryOptions: string[] = [];
    @observable.ref accessor userOptions: string[] = [];
    @observable.ref accessor directoryGroupOptions: string[] = [];
    @observable.ref accessor roleOptions: SelectOption[] = [];

    @managed readonly formModel: FormModel = this.createFormModel();
    @managed readonly usersGridModel: GridModel = this.createGridModel('USER');
    @managed readonly directoryGroupsGridModel: GridModel = this.createGridModel('DIRECTORY_GROUP');
    @managed readonly rolesGridModel: GridModel = this.createGridModel('ROLE');

    // Set to false if the server 404s the search endpoint (i.e. app on an older hoist-core).
    private directoryGroupSearchAvailable = true;

    @computed
    get isDirty(): boolean {
        return this.formModel.isDirty || this.hasDirtyMembers;
    }

    @computed
    get hasDirtyMembers(): boolean {
        return (
            this.usersGridModel.store.isDirty ||
            this.directoryGroupsGridModel.store.isDirty ||
            this.rolesGridModel.store.isDirty
        );
    }

    @computed
    get isValid(): boolean {
        return (
            this.formModel.isValid &&
            this.usersGridModel.store.isValid &&
            this.directoryGroupsGridModel.store.isValid &&
            this.rolesGridModel.store.isValid
        );
    }

    get moduleConfig(): RoleModuleConfig {
        return this.roleModel.moduleConfig;
    }

    get roleName(): string {
        return this.formModel.values.name ?? 'New Role';
    }

    constructor(roleModel: RoleModel) {
        super();

        this.roleModel = roleModel;
        this.addReaction(
            this.clearDegenerateRowReaction(this.usersGridModel),
            this.clearDegenerateRowReaction(this.directoryGroupsGridModel),
            this.clearDegenerateRowReaction(this.rolesGridModel)
        );
    }

    @action
    init(allRoles: HoistRole[], role?: Partial<HoistRole>) {
        this.formModel.init(role ?? {});
        this.usersGridModel.loadData(sortBy(role?.users?.map(name => ({name})) ?? [], 'name'));
        this.userOptions = uniq(
            allRoles.flatMap(role => role.effectiveUsers.map(it => it.name))
        ).sort();
        this.directoryGroupsGridModel.loadData(
            sortBy(
                role?.directoryGroups?.map(name => ({
                    name,
                    displayName: this.roleModel.getDirectoryGroupInfo(name)?.displayName,
                    error:
                        role.errors.directoryGroups[name] ??
                        this.roleModel.getDirectoryGroupLookupError(name)
                })) ?? [],
                it => it.displayName ?? it.name
            )
        );
        this.directoryGroupOptions = uniq(allRoles.flatMap(role => role.directoryGroups)).sort();
        this.categoryOptions = uniq(
            allRoles.map(it => it.category).filter(it => it != null)
        ).sort();
        this.rolesGridModel.loadData(sortBy(role?.roles?.map(name => ({name})) ?? [], 'name'));
        this.roleOptions = sortBy(
            map(groupBy(allRoles, 'category'), (roles, category) => ({
                label: category == 'null' ? '*Uncategorized*' : category,
                options: without(map(roles, 'name'), role?.name).sort()
            })),
            ['label']
        );
        this.invalidNames = allRoles.map(it => it.name).filter(it => it !== role?.name);
        this.formModel.getField('name').setReadonly(!isNil(role?.name));
    }

    async validateAsync(): Promise<boolean> {
        const results = await Promise.all([
            this.formModel.validateAsync(),
            this.usersGridModel.store.validateAsync(),
            this.directoryGroupsGridModel.store.validateAsync(),
            this.rolesGridModel.store.validateAsync()
        ]);
        return results.every(Boolean);
    }

    getData(): HoistRole {
        return {
            ...this.formModel.getData(),
            users: this.usersGridModel.store.allRecords.map(it => it.get('name')),
            directoryGroups: this.directoryGroupsGridModel.store.allRecords.map(it =>
                it.get('name')
            ),
            roles: this.rolesGridModel.store.allRecords.map(it => it.get('name'))
        } as HoistRole;
    }

    //------------------
    // Implementation
    //------------------
    private createFormModel(): FormModel {
        return new FormModel({
            fields: [
                {
                    name: 'name',
                    rules: [
                        required,
                        ({value}) =>
                            this.invalidNames.some(it => it.toLowerCase() === value?.toLowerCase())
                                ? `Role "${value}" already exists.`
                                : null
                    ]
                },
                {name: 'category'},
                {name: 'notes'}
            ]
        });
    }

    private createGridModel(entity: RoleMemberType): GridModel {
        return new GridModel({
            emptyText: 'None added.',
            hideHeaders: true,
            showHover: true,
            selModel: 'multiple',
            store: {
                fields: [
                    {name: 'displayName', type: 'string'}, // For directory groups
                    {name: 'error', type: 'string'}
                ],
                idSpec: XH.genId
            },
            columns: [
                {
                    field: {
                        name: 'name',
                        rules: [
                            required,
                            ({value, record}) =>
                                record.store.allRecords.some(
                                    it =>
                                        it !== record &&
                                        it.get('name')?.toLowerCase() === value?.toLowerCase()
                                )
                                    ? `${value} already added.`
                                    : null
                        ]
                    },
                    flex: 1,
                    editable: true,
                    editor: props => {
                        const selected = props.gridModel.store.allRecords.map(it => it.get('name'));
                        if (
                            entity === 'DIRECTORY_GROUP' &&
                            this.moduleConfig?.directoryGroupsSupported
                        ) {
                            return selectEditor({
                                ...props,
                                inputProps: {
                                    enableCreate: true,
                                    // Open on focus so the empty-state message below doubles as a
                                    // prompt for what to type.
                                    openMenuOnFocus: true,
                                    createMessageFn: q => `Add ${q}`,
                                    queryFn: q => this.queryDirectoryGroupsAsync(q, selected),
                                    optionRenderer: opt => this.directoryGroupOptionRenderer(opt),
                                    noOptionsMessageFn: q => {
                                        if (!q) {
                                            return (
                                                this.moduleConfig?.directoryGroupsDescription ??
                                                'Search for a directory group by name.'
                                            );
                                        }
                                        return q.length < RoleFormModel.SEARCH_MIN_CHARS
                                            ? `Type at least ${RoleFormModel.SEARCH_MIN_CHARS} characters to search the directory.`
                                            : 'No matching groups found.';
                                    },
                                    generateOptionFn: value => ({
                                        label: this.roleModel.getDirectoryGroupDisplayName(value),
                                        value
                                    })
                                }
                            });
                        }
                        // Static options for users and roles - and for directory groups when the
                        // module does not support them (this panel then renders only if the role
                        // has existing groups assigned, with a warning that they will be ignored).
                        const options =
                            entity === 'USER'
                                ? this.userOptions
                                : entity === 'DIRECTORY_GROUP'
                                  ? this.directoryGroupOptions
                                  : this.roleOptions;
                        return selectEditor({
                            ...props,
                            inputProps: {
                                enableCreate: entity !== 'ROLE',
                                openMenuOnFocus: true,
                                createMessageFn: user => `Add ${user}`,
                                options: this.filterSelected(options, selected)
                            }
                        });
                    },
                    renderer: (v, {record}) => {
                        const {displayName, error} = record.data;
                        return hbox({
                            alignItems: 'center',
                            items: [
                                box({
                                    item:
                                        entity === 'DIRECTORY_GROUP'
                                            ? (displayName ?? RoleModel.fmtDirectoryGroup(v))
                                            : v,
                                    paddingRight: 'var(--xh-pad-half-px)'
                                }),
                                Icon.warning({omit: !error, intent: 'warning'})
                            ]
                        });
                    },
                    // Show the raw identifier - an opaque GUID for Entra ID, a DN for LDAP - plus
                    // any lookup error. A plain string picks up the standard grid tooltip styling.
                    tooltip:
                        entity === 'DIRECTORY_GROUP'
                            ? (v, {record}) => compact([v, record.data.error]).join('\n\n')
                            : null,
                    rendererIsComplex: true,
                    setValueFn: ({record, store, value}) => {
                        const {id} = record;
                        store.modifyRecords({id, name: value, displayName: null, error: null});
                        if (entity === 'DIRECTORY_GROUP') {
                            this.lookupDirectoryGroupAsync(value, id as string);
                            this.resolveDirectoryGroupDisplayAsync(value, id as string);
                        }
                    }
                },
                {
                    ...actionCol,
                    width: calcActionColWidth(1),
                    actions: [this.createRemoveAssignmentAction()]
                }
            ],
            contextMenu: [...this.ACTIONS, '-', ...GridModel.defaults.contextMenu]
        });
    }

    private filterSelected(
        options: Array<string | SelectOption>,
        selected: string[]
    ): Array<string | SelectOption> {
        const ret: Array<string | SelectOption> = [];
        for (let option of options) {
            if (isString(option)) {
                if (!selected.includes(option)) ret.push(option);
            } else {
                ret.push({...option, options: this.filterSelected(option.options, selected)});
            }
        }
        return ret;
    }

    private createAddAssigmentAction(): RecordActionSpec {
        return {
            text: 'Add',
            icon: Icon.add(),
            intent: 'success',
            actionFn: ({gridModel}) => {
                const id = XH.genId();
                gridModel.store.addRecords({id});
                gridModel.beginEditAsync({record: id, colId: 'name'});
            }
        };
    }

    private createRemoveAssignmentAction(): RecordActionSpec {
        return {
            text: 'Remove',
            icon: Icon.delete(),
            intent: 'danger',
            actionFn: ({selectedRecords, gridModel}) =>
                gridModel.store.removeRecords(selectedRecords),
            recordsRequired: true
        };
    }

    private clearDegenerateRowReaction(gridModel: GridModel): ReactionSpec {
        const {store} = gridModel;
        return {
            track: () => gridModel.isEditing,
            run: isEditing => {
                if (!isEditing) {
                    const degenerate = store.addedRecords.filter(r => r.data.name == null);
                    store.removeRecords(degenerate);
                }
            },
            debounce: 250
        };
    }

    private async queryDirectoryGroupsAsync(
        query: string,
        selected: string[]
    ): Promise<SelectOption[]> {
        const {roleModel} = this;

        // Require a minimal query before searching the directory itself - a too-short query (e.g.
        // a single char) would fan out to a very broad directory scan for little benefit. Short
        // queries filter groups already assigned across all roles, as does any query if
        // server-side search is unavailable (e.g. app on an older hoist-core).
        if (
            (query?.length ?? 0) < RoleFormModel.SEARCH_MIN_CHARS ||
            !this.directoryGroupSearchAvailable
        ) {
            return this.knownDirectoryGroupOptions(selected, query);
        }

        try {
            const {data} = await this.runner().span('searchDirectoryGroups').fetchJson({
                autoAbortKey: 'roleAdmin/searchDirectoryGroups',
                url: 'roleAdmin/searchDirectoryGroups',
                params: {query}
            });
            const groups = data as DirectoryGroupInfo[];

            // Seed shared lookup cache, so grids render friendly names for any chosen group.
            roleModel.updateDirectoryGroupInfo(keyBy(groups, 'id'));
            return groups
                .filter(it => !selected.includes(it.id))
                .map(it => ({
                    label: it.displayName,
                    value: it.id,
                    description: it.description,
                    mail: it.mail
                }));
        } catch (e) {
            if (e?.httpStatus === 404) {
                this.directoryGroupSearchAvailable = false;
                this.logWarn(
                    'Server does not support directory group search - falling back to groups already assigned',
                    e
                );
            } else {
                this.logError('Directory group search failed', e);
            }
            return this.knownDirectoryGroupOptions(selected, query);
        }
    }

    // Render search options with secondary detail - group names are not unique in a directory,
    // so the description or mail address can be the only way to tell similar groups apart.
    private directoryGroupOptionRenderer(opt: SelectOption): ReactNode {
        const detail = (opt as PlainObject).description ?? (opt as PlainObject).mail;
        return vbox(
            span(opt.label),
            span({
                item: detail,
                omit: !detail,
                className: 'xh-text-color-muted xh-font-size-small'
            })
        );
    }

    private knownDirectoryGroupOptions(selected: string[], query: string = null): SelectOption[] {
        const known = this.filterSelected(this.directoryGroupOptions, selected) as string[],
            options = known.map(name => ({
                label: this.roleModel.getDirectoryGroupDisplayName(name),
                value: name
            })),
            lcQuery = query?.toLowerCase();
        return sortBy(
            lcQuery ? options.filter(it => it.label.toLowerCase().includes(lcQuery)) : options,
            'label'
        );
    }

    /** Resolve and apply display info for a newly-entered directory group identifier. */
    private async resolveDirectoryGroupDisplayAsync(directoryGroup: string, recordId: string) {
        const {roleModel} = this;
        let info = roleModel.getDirectoryGroupInfo(directoryGroup);
        if (!info && roleModel.directoryGroupInfoAvailable) {
            try {
                const {data} = await this.runner()
                    .span('directoryGroupsInfo')
                    .fetchJson({
                        autoAbortKey: `roleAdmin/directoryGroupsInfo-${recordId}`,
                        url: 'roleAdmin/directoryGroupsInfo',
                        params: {names: [directoryGroup]}
                    });
                roleModel.updateDirectoryGroupInfo(data);
                info = roleModel.getDirectoryGroupInfo(directoryGroup);
            } catch (e) {
                if (e?.httpStatus === 404) {
                    roleModel.directoryGroupInfoAvailable = false;
                } else {
                    this.logError('Failed to resolve directory group display info', e);
                }
                return;
            }
        }
        if (info) {
            this.directoryGroupsGridModel.store.modifyRecords({
                id: recordId,
                displayName: info.displayName
            });
        }
    }

    private async lookupDirectoryGroupAsync(directoryGroup: string, recordId: string) {
        return this.runner()
            .span('usersForDirectoryGroup')
            .linkTo(this.directoryGroupLookupTask)
            .run(async ctx => {
                const {data} = await XH.fetchJson(
                    {
                        autoAbortKey: `roleAdmin/usersForDirectoryGroup-${recordId}`,
                        url: 'roleAdmin/usersForDirectoryGroup',
                        params: {name: directoryGroup}
                    },
                    ctx
                );
                if (isString(data)) {
                    this.directoryGroupsGridModel.store.modifyRecords({
                        id: recordId,
                        error: data
                    });
                }
            })
            .catch(e => {
                const errorMsg = 'Error looking up directory group';
                XH.handleException(e, {alertType: 'toast', title: errorMsg});
                this.directoryGroupsGridModel.store.modifyRecords({
                    id: recordId,
                    error: errorMsg
                });
            });
    }
}
