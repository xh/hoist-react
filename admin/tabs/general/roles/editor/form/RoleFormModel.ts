/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {RoleModel} from '@xh/hoist/admin/tabs/general/roles/RoleModel';
import {
    HoistRole,
    RoleMemberType,
    RoleModuleConfig
} from '@xh/hoist/admin/tabs/general/roles/Types';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {box, hbox} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, ReactionSpec, SelectOption, TaskObserver, XH} from '@xh/hoist/core';
import {RecordActionSpec, required} from '@xh/hoist/data';
import {actionCol, calcActionColWidth, selectEditor} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {groupBy, isNil, isString, map, sortBy, uniq, without} from 'lodash';
import {action, computed, observable} from 'mobx';

export class RoleFormModel extends HoistModel {
    readonly ADD_ASSIGNMENT_ACTION: RecordActionSpec = this.createAddAssigmentAction();
    readonly ACTIONS: RecordActionSpec[] = [
        this.ADD_ASSIGNMENT_ACTION,
        this.createRemoveAssignmentAction()
    ];
    readonly directoryGroupLookupTask = TaskObserver.trackLast();
    readonly roleModel: RoleModel;

    @managed readonly formModel: FormModel = this.createFormModel();
    @managed readonly usersGridModel: GridModel = this.createGridModel('USER');
    @managed readonly directoryGroupsGridModel: GridModel = this.createGridModel('DIRECTORY_GROUP');
    @managed readonly rolesGridModel: GridModel = this.createGridModel('ROLE');

    @observable isEditingExistingRole = false;

    @observable.ref invalidNames: string[] = [];
    @observable.ref categoryOptions: string[] = [];
    @observable.ref userOptions: string[] = [];
    @observable.ref directoryGroupOptions: string[] = [];
    @observable.ref roleOptions: SelectOption[] = [];

    @computed
    get isDirty(): boolean {
        return this.formModel.isDirty || this.hasDirtyMembers;
    }

    @computed
    get hasDirtyMembers(): boolean {
        return (
            this.usersGridModel.store.isModified ||
            this.directoryGroupsGridModel.store.isModified ||
            this.rolesGridModel.store.isModified
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
                    error: role.errors.directoryGroups[name]
                })) ?? [],
                'name'
            )
        );
        this.directoryGroupOptions = uniq(allRoles.flatMap(role => role.directoryGroups)).sort();
        this.categoryOptions = uniq(
            allRoles
                .map(it => {
                    return it.category3
                        ? `${it.category1}\\${it?.category2}\\${it?.category3}`
                        : it.category2
                          ? `${it.category1}\\${it.category2}`
                          : it.category1 ?? 'Uncategorized';
                })
                .filter(it => it != null)
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

    // -------------------------------
    // Implementation
    // -------------------------------

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
            selModel: 'multiple',
            store: {
                fields: [{name: 'error', type: 'string'}],
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
                        const selected = props.gridModel.store.allRecords.map(it => it.get('name')),
                            options =
                                entity === 'USER'
                                    ? this.userOptions
                                    : entity === 'DIRECTORY_GROUP'
                                      ? this.directoryGroupOptions
                                      : this.roleOptions;
                        return selectEditor({
                            ...props,
                            inputProps: {
                                enableCreate: entity !== 'ROLE',
                                options: this.filterSelected(options, selected)
                            }
                        });
                    },
                    renderer: (v, {record}) => {
                        const {error} = record.data;
                        return hbox({
                            alignItems: 'center',
                            items: [
                                box({
                                    item:
                                        entity === 'DIRECTORY_GROUP'
                                            ? RoleModel.fmtDirectoryGroup(v)
                                            : v,
                                    paddingRight: 'var(--xh-pad-half-px)',
                                    title: v
                                }),
                                Icon.warning({omit: !error, intent: 'warning', title: error})
                            ]
                        });
                    },
                    rendererIsComplex: true,
                    setValueFn: ({record, store, value}) => {
                        const {id} = record;
                        store.modifyRecords({id, name: value, error: null});
                        if (entity === 'DIRECTORY_GROUP')
                            this.lookupDirectoryGroupAsync(value, id as string);
                    }
                },
                {
                    ...actionCol,
                    width: calcActionColWidth(1),
                    actions: [this.createRemoveAssignmentAction()]
                }
            ],
            contextMenu: [...this.ACTIONS, '-', ...GridModel.defaultContextMenu]
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
                gridModel.beginEditAsync({record: id});
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

    private async lookupDirectoryGroupAsync(directoryGroup: string, recordId: string) {
        try {
            const {data} = await XH.fetchJson({
                autoAbortKey: `roleAdmin/usersForDirectoryGroup-${recordId}`,
                url: 'roleAdmin/usersForDirectoryGroup',
                params: {name: directoryGroup}
            }).linkTo(this.directoryGroupLookupTask);
            if (isString(data)) {
                this.directoryGroupsGridModel.store.modifyRecords({
                    id: recordId,
                    error: data
                });
            }
        } catch (e) {
            XH.handleException(e, {alertType: 'toast', title: 'Error looking up directory group'});
        }
    }
}
