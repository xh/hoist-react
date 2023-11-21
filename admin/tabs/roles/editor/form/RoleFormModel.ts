import {
    assignmentsPanel,
    assignmentsTab
} from '@xh/hoist/admin/tabs/roles/editor/form/cmp/Assignments';
import {RolesModel} from '@xh/hoist/admin/tabs/roles/RolesModel';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
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
    @managed readonly inheritsGridModel: GridModel = this.createGridModel('inherits');
    @managed readonly tabContainerModel: TabContainerModel = this.createTabContainerModel();

    @observable isEditingExistingRole = false;

    @observable.ref directoryGroupOptions: string[] = [];
    @observable.ref groupOptions: string[] = [];
    @observable.ref userOptions: string[] = [];
    @observable.ref inheritsOptions: SelectOption[] = [];
    @observable.ref invalidNames: string[] = [];

    // Returns true if any of the form fields / grids are dirty
    @computed
    get isDirty(): boolean {
        return this.formModel.isDirty || this.isSubstantiallyDirty;
    }

    // Ignores meta-data changes
    @computed
    get isSubstantiallyDirty(): boolean {
        return this.hasDirtyAssignments || this.hasDirtyInherits;
    }

    @computed
    get hasDirtyAssignments(): boolean {
        return (
            this.directoryGroupsGridModel.store.isModified || this.usersGridModel.store.isModified
        );
    }

    @computed
    get hasDirtyInherits(): boolean {
        return this.inheritsGridModel.store.isModified;
    }

    @computed
    get isValid(): boolean {
        return (
            this.formModel.isValid &&
            this.directoryGroupsGridModel.store.isValid &&
            this.usersGridModel.store.isValid &&
            this.inheritsGridModel.store.isValid
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
        this.inheritsGridModel.loadData(role?.inherits.map(name => ({name})) ?? []);
        this.inheritsOptions = map(groupBy(allRoles, 'groupName'), (roles, groupName) => ({
            label: groupName,
            options: roles.filter(it => it.name !== role?.name).map(it => it.name)
        }));
        this.invalidNames = allRoles.map(it => it.name).filter(it => it !== role?.name);
    }

    async validateAsync(): Promise<boolean> {
        const results = await Promise.all([
            this.formModel.validateAsync(),
            this.directoryGroupsGridModel.store.validateAsync(),
            this.usersGridModel.store.validateAsync()
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
            inherits: this.inheritsGridModel.store.allRecords.map(it => it.get('name'))
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

    private createGridModel(entity: 'users' | 'groups' | 'inherits'): GridModel {
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
                                    : this.inheritsOptions;
                        return selectEditor({
                            ...props,
                            inputProps: {
                                enableCreate: entity !== 'inherits',
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

    private createTabContainerModel(): TabContainerModel {
        return new TabContainerModel({
            persistWith: {...RolesModel.PERSIST_WITH, path: 'editorTabContainer'},
            tabs: [
                {
                    id: 'assignments',
                    icon: Icon.userCheck(),
                    content: assignmentsTab
                },
                {
                    id: 'inheritedRoles',
                    icon: Icon.treeList(),
                    content: () => assignmentsPanel({entity: 'Roles'})
                }
            ]
        });
    }
}
