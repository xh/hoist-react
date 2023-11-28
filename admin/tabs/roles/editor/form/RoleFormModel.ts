import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, HoistRole, managed, SelectOption, XH} from '@xh/hoist/core';
import {RecordActionSpec, required} from '@xh/hoist/data';
import {actionCol, calcActionColWidth, selectEditor} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {groupBy, isString, map, uniq} from 'lodash';
import {action, computed, observable} from 'mobx';

export class RoleFormModel extends HoistModel {
    readonly ACTIONS: RecordActionSpec[] = [
        this.createAddAssigmentAction(),
        this.createRemoveAssignmentAction()
    ];

    @managed readonly formModel: FormModel = this.createFormModel();
    @managed readonly usersGridModel: GridModel = this.createGridModel('users');
    @managed readonly directoryGroupsGridModel: GridModel = this.createGridModel('groups');
    @managed readonly rolesGridModel: GridModel = this.createGridModel('roles');

    @observable isEditingExistingRole = false;

    @observable.ref invalidNames: string[] = [];
    @observable.ref groupOptions: string[] = [];
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

    @action
    init(allRoles: HoistRole[], role?: HoistRole) {
        this.isEditingExistingRole = !!role;
        this.formModel.init(role ?? {});
        this.usersGridModel.loadData(role?.users.map(name => ({name})) ?? []);
        this.userOptions = uniq(allRoles.flatMap(role => role.users)).sort();
        this.directoryGroupsGridModel.loadData(role?.directoryGroups.map(name => ({name})) ?? []);
        this.directoryGroupOptions = uniq(allRoles.flatMap(role => role.directoryGroups)).sort();
        this.groupOptions = uniq(allRoles.map(it => it.groupName)).sort();
        this.rolesGridModel.loadData(role?.roles.map(name => ({name})) ?? []);
        this.roleOptions = map(groupBy(allRoles, 'groupName'), (roles, groupName) => ({
            label: groupName,
            options: roles.filter(it => it.name !== role?.name).map(it => it.name)
        }));
        this.invalidNames = allRoles.map(it => it.name).filter(it => it !== role?.name);
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
                {name: 'groupName'},
                {name: 'notes'}
            ]
        });
    }

    private createGridModel(entity: 'users' | 'groups' | 'roles'): GridModel {
        return new GridModel({
            selModel: 'multiple',
            store: {
                idSpec: XH.genId
            },
            columns: [
                {
                    ...actionCol,
                    width: calcActionColWidth(1),
                    actions: [this.createRemoveAssignmentAction()]
                },
                {
                    field: {name: 'name', rules: [required]},
                    flex: 1,
                    editable: true,
                    editor: props => {
                        const selected = props.gridModel.store.allRecords.map(it => it.get('name')),
                            options =
                                entity === 'users'
                                    ? this.userOptions
                                    : entity === 'groups'
                                    ? this.directoryGroupOptions
                                    : this.roleOptions;
                        return selectEditor({
                            ...props,
                            inputProps: {
                                enableCreate: entity !== 'roles',
                                options: this.filterSelected(options, selected)
                            }
                        });
                    }
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
}
