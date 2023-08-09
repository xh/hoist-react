import {FormModel} from '@xh/hoist/cmp/form';
import {form} from '@xh/hoist/cmp/form/Form';
import {filler, vbox} from '@xh/hoist/cmp/layout';
import {HoistModel, creates, hoistCmp, managed} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {RoleDialogModel} from './Dialog';
import {InspectorTabModel} from './InspectorTab';

class RoleUpdateFormModel extends HoistModel {
    @bindable reason;

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
                name: 'inheritedRoles',
                displayName: 'Inherits'
            },
            {
                name: 'notes',
                displayName: 'Notes'
            },
            {
                name: 'users',
                displayName: 'Users'
            }
        ]
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
        this.formModel.fields['name'].setValue(referencedRole?.name);
        this.formModel.fields['groupName'].setValue(referencedRole?.groupName);
        this.formModel.fields['inheritedRoles'].setValue(referencedRole?.inheritedRoles);
        this.formModel.fields['notes'].setValue(referencedRole?.notes);
        this.formModel.fields['users'].setValue(referencedRole?.users);
    }

    private clearForm() {
        this.formModel.reset();
    }
}

export const roleUpdateForm = hoistCmp.factory({
    model: creates(RoleUpdateFormModel),

    render({model}) {
        return panel({
            item: form({
                items: vbox({
                    items: [
                        formField({field: 'name', item: textInput()}),
                        formField({field: 'groupName', item: textInput()}),
                        formField({field: 'inheritedRoles', item: textInput()}),
                        formField({field: 'notes', item: textInput()}),
                        formField({field: 'users', item: textInput()})
                    ]
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
                        model
                            .lookupModel(InspectorTabModel)
                            .getImpactEdit(model.formModel.getData());
                    }
                })
            )
        });
    }
});
