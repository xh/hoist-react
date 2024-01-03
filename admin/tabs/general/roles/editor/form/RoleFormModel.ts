import {RoleModel} from '@xh/hoist/admin/tabs/general/roles/RoleModel';
import {
    HoistRole,
    RoleMemberType,
    RoleServiceConfig
} from '@xh/hoist/admin/tabs/general/roles/Types';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {div} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, ReactionSpec, SelectOption, XH} from '@xh/hoist/core';
import {RecordActionSpec, required} from '@xh/hoist/data';
import {actionCol, calcActionColWidth, selectEditor} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {groupBy, isNil, map, sortBy, uniq, without} from 'lodash';
import {action, computed, observable} from 'mobx';

export class RoleFormModel extends HoistModel {
    readonly ADD_ASSIGNMENT_ACTION: RecordActionSpec = this.createAddAssigmentAction();
    readonly ACTIONS: RecordActionSpec[] = [
        this.ADD_ASSIGNMENT_ACTION,
        this.createRemoveAssignmentAction()
    ];

    @managed readonly formModel: FormModel = this.createFormModel();
    @managed readonly usersGridModel: GridModel = this.createGridModel('USER');
    @managed readonly directoryGroupsGridModel: GridModel = this.createGridModel('DIRECTORY_GROUP');
    @managed readonly rolesGridModel: GridModel = this.createGridModel('ROLE');

    @observable isEditingExistingRole = false;

    @observable.ref invalidNames: string[] = [];
    @observable.ref categoryOptions: string[] = [];
    @observable.ref userOptions: SelectOption[] = [];
    @observable.ref directoryGroupOptions: SelectOption[] = [];
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

    get softConfig(): RoleServiceConfig {
        return XH.getConf('xhRoleModuleConfig');
    }

    constructor() {
        super();
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
        this.userOptions = uniq(allRoles.flatMap(role => role.users))
            .sort()
            .map(it => ({label: it, value: it}));
        this.directoryGroupsGridModel.loadData(
            sortBy(role?.directoryGroups?.map(name => ({name})) ?? [], 'name')
        );
        this.directoryGroupOptions = uniq(allRoles.flatMap(role => role.directoryGroups))
            .sort()
            .map(it => ({label: RoleModel.fmtDirectoryGroup(it), value: it}));
        this.categoryOptions = uniq(allRoles.map(it => it.category)).sort();
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
                            this.invalidNames.includes(value)
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
                idSpec: XH.genId
            },
            columns: [
                {
                    field: {name: 'name', rules: [required]},
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
                            inputProps:
                                entity === 'ROLE'
                                    ? {options: this.filterSelected(options, selected)}
                                    : {
                                          enableCreate: true,
                                          menuWidth: 350,
                                          optionRenderer: ({label, value}) =>
                                              div({item: label, title: value}),
                                          rsOptions: {
                                              defaultOptions: this.filterSelected(options, selected)
                                          },
                                          queryFn: async query => {
                                              const endpoint =
                                                      entity === 'USER'
                                                          ? 'queryUsers'
                                                          : 'queryDirectoryGroups',
                                                  {data} = await XH.fetchJson({
                                                      url: `roleAdmin/${endpoint}`,
                                                      params: {query}
                                                  });
                                              return this.filterSelected(data, selected);
                                          }
                                      }
                        });
                    },
                    renderer: v =>
                        entity === 'DIRECTORY_GROUP' ? RoleModel.fmtDirectoryGroup(v) : v,
                    tooltip: true
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
        options: SelectOption[],
        selected: string[]
    ): Array<string | SelectOption> {
        const ret: Array<string | SelectOption> = [];
        for (let option of options) {
            if (!option.options) {
                if (!selected.includes(option.value)) ret.push(option);
            } else {
                ret.push({...option, options: this.filterSelected(option.options, selected)});
            }
        }
        return ret;
    }

    createAddAssigmentAction(): RecordActionSpec {
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
}
