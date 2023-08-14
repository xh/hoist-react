import {FormModel} from '@xh/hoist/cmp/form';
import {form} from '@xh/hoist/cmp/form/Form';
import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {filler, hbox, label, vbox} from '@xh/hoist/cmp/layout';
import {HoistModel, XH, creates, hoistCmp, managed} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {select, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {RoleDialogModel} from './Dialog';
import {InspectorTabModel} from './InspectorTab';

class RoleUpdateFormModel extends HoistModel {
    @bindable reason;

    @bindable groupOptions;

    @managed formModel = new FormModel({
        fields: [
            {
                name: 'name',
                displayName: 'Name'
            },
            {
                name: 'groupName',
                displayName: 'Group Name'
            },
            {
                name: 'notes',
                displayName: 'Notes'
            }
        ]
    });

    @managed userStore = new Store({
        idSpec: 'user',
        fields: [{name: 'user', type: 'string'}]
    });

    @managed userGridModel = new GridModel({
        emptyText: 'No users assigned',
        store: this.userStore,
        columns: [
            {field: 'user', flex: 1, editable: true},
            {
                ...actionCol,
                width: calcActionColWidth(1),
                actions: [
                    {
                        icon: Icon.close(),
                        intent: 'danger',
                        actionFn: ({record}) => this.userStore.removeRecords(record)
                    }
                ]
            }
        ],
        hideHeaders: true,
        selModel: 'disabled',
        stripeRows: false
    });

    @managed inheritedStore = new Store({
        idSpec: 'role',
        fields: [{name: 'role', type: 'string'}]
    });

    @managed inheritedGridModel = new GridModel({
        emptyText: 'No inherited roles',
        store: this.inheritedStore,
        columns: [
            {field: 'role', flex: 1, editable: true},
            {
                ...actionCol,
                width: calcActionColWidth(1),
                actions: [
                    {
                        icon: Icon.close(),
                        intent: 'danger',
                        actionFn: ({record}) => this.inheritedStore.removeRecords(record)
                    }
                ]
            }
        ],
        hideHeaders: true,
        selModel: 'disabled',
        stripeRows: false
    });

    constructor() {
        super();
        makeObservable(this);
    }

    override async onLinked() {
        this.reason = this.lookupModel(RoleDialogModel).reason;
        if (this.reason === 'add') {
            this.clearForm();
        } else {
            this.updateForm(this.lookupModel(InspectorTabModel).selectedRoleDetails);
        }
    }

    private updateForm(referencedRole) {
        this.formModel.fields['name'].setValue(referencedRole.name);
        this.formModel.fields['groupName'].setValue(referencedRole.groupName);
        this.formModel.fields['notes'].setValue(referencedRole.notes);

        const assignedUsers = referencedRole.allUsers
            .filter(u => u.reason === referencedRole.name)
            .map(u => {
                return {user: u.user};
            });
        this.userStore.loadData(assignedUsers);

        const assignedInheritedRoles = referencedRole.inheritedRoles
            .filter(r => r.reason === referencedRole.name)
            .map(r => {
                return {role: r.role};
            });
        this.inheritedStore.loadData(assignedInheritedRoles);
    }

    private clearForm() {
        this.formModel.reset();
        this.userStore.clear();
        this.inheritedStore.clear();
    }

    override async doLoadAsync() {
        const resp = await XH.fetchJson({
            url: 'rolesAdmin/allGroups'
        });
        this.groupOptions = resp;
    }
}

export const roleUpdateForm = hoistCmp.factory({
    model: creates(RoleUpdateFormModel),

    render({model}) {
        return panel({
            item: form({
                items: vbox({
                    items: [
                        hbox(
                            formField({field: 'name', item: textInput(), flex: 1}),
                            formField({
                                field: 'groupName',
                                item: select({
                                    enableMulti: true,
                                    enableCreate: true,
                                    options: model.groupOptions
                                }),
                                flex: 1
                            })
                        ),
                        formField({
                            field: 'notes',
                            item: textArea(),
                            height: 150
                        }),
                        hbox({
                            items: [
                                vbox({
                                    items: [
                                        hbox(
                                            label({
                                                item: 'Users (directly assigned)',
                                                className: 'xh-form-field-label',
                                                style: {paddingBlock: 3}
                                            }),
                                            filler(),
                                            button({
                                                icon: Icon.add(),
                                                text: 'Add',
                                                intent: 'success',
                                                style: {minHeight: 0, paddingBlock: 0},
                                                onClick: () => {
                                                    const newId = XH.genId();
                                                    model.userStore.addRecords({
                                                        id: newId,
                                                        user: 'New User'
                                                    });
                                                    model.userGridModel.beginEditAsync({
                                                        record: newId,
                                                        colId: 'user'
                                                    });
                                                }
                                            })
                                        ),
                                        grid({
                                            model: model.userGridModel
                                        })
                                    ],
                                    style: {
                                        height: 'clamp(50px, 25vh, 650px)',
                                        flex: 1
                                    },
                                    className: 'xh-form-field'
                                }),
                                vbox({
                                    items: [
                                        hbox(
                                            label({
                                                item: 'Inherited Roles (directly assigned)',
                                                className: 'xh-form-field-label',
                                                style: {paddingBlock: 3}
                                            }),
                                            filler(),
                                            button({
                                                icon: Icon.add(),
                                                text: 'Add',
                                                intent: 'success',
                                                style: {minHeight: 0, paddingBlock: 0},
                                                onClick: () => {
                                                    const newId = XH.genId();
                                                    model.inheritedStore.addRecords({
                                                        id: newId,
                                                        role: 'New Inherited Role'
                                                    });
                                                    // is it possible to provide some form of validation here?
                                                    // to suggest already exisiting roles? similar to
                                                    // multi-select tags...
                                                    model.inheritedGridModel.beginEditAsync({
                                                        record: newId,
                                                        colId: 'role'
                                                    });
                                                }
                                            })
                                        ),
                                        grid({
                                            model: model.inheritedGridModel
                                        })
                                    ],
                                    style: {
                                        height: 'clamp(50px, 25vh, 650px)',
                                        flex: 1
                                    },
                                    className: 'xh-form-field'
                                })
                            ]
                        })
                    ],
                    style: {padding: '0.5em'}
                })
            }),
            bbar: toolbar(
                button({
                    icon: Icon.delete(),
                    text: 'Delete',
                    intent: 'danger',
                    omit: model.reason === 'add',
                    onClick: () => {
                        model
                            .lookupModel(InspectorTabModel)
                            .getImpactDelete(model.lookupModel(InspectorTabModel).selectedRoleName);
                    }
                }),
                filler(),
                button({
                    text: 'Cancel',
                    onClick: () => model.lookupModel(RoleDialogModel).closeDialog()
                }),
                button({
                    icon: Icon.check(),
                    text: 'Save',
                    intent: 'success',
                    onClick: () => {
                        const data = model.formModel.getData();
                        const users = model.userStore.records;
                        const inheritedRoles = model.inheritedStore.records;
                        if (model.reason == 'edit') {
                            model.lookupModel(InspectorTabModel).getImpactEdit(
                                data.name,
                                data.groupName,
                                data.notes,
                                users.map(u => u.id),
                                inheritedRoles.map(r => r.id)
                            );
                        } else if (model.reason == 'add') {
                            window.alert('adding');
                        }
                    }
                })
            )
        });
    }
});
