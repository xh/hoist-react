import {HoistModel, XH, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {div, hbox, vbox} from '@xh/hoist/cmp/layout';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {form} from '@xh/hoist/cmp/form';
import {dateInput, select, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {InspectorTabModel} from '../InspectorTab';
import {makeObservable, observable} from 'mobx';
import {FormModel} from '@xh/hoist/cmp/form';
import {Store} from '@xh/hoist/data';

class RoleDetailsModel extends HoistModel {
    @lookup(() => InspectorTabModel) inspectorTab: InspectorTabModel;

    @managed roleNameStore = new Store({
        fields: [{name: 'roleName', type: 'string'}],
        idSpec: 'roleName'
    });

    @managed
    formModel = new FormModel({
        fields: [
            {
                name: 'name'
            },
            {
                name: 'groupName'
            },
            {
                name: 'lastUpdated'
            },
            {
                name: 'lastUpdatedBy'
            },
            {
                name: 'notes'
            },
            {
                name: 'inherits'
            }
        ]
    });

    @observable
    roleOptions = [];

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.inspectorTab.selectedRole,
            run: role => {
                // assign values
                this.formModel.fields['name'].setValue(this.inspectorTab.selectedRole?.name);
                this.formModel.fields['groupName'].setValue(
                    this.inspectorTab.selectedRole?.groupName
                );
                this.formModel.fields['lastUpdated'].setValue(
                    this.inspectorTab.selectedRole?.lastUpdated
                );
                this.formModel.fields['lastUpdatedBy'].setValue(
                    this.inspectorTab.selectedRole?.lastUpdatedBy
                );
                this.formModel.fields['notes'].setValue(this.inspectorTab.selectedRole?.notes);
                this.formModel.fields['inherits'].setValue(
                    this.inspectorTab.selectedRole?.inherits
                );
            },
            fireImmediately: true
        });
    }

    override async doLoadAsync() {
        const resp = await XH.fetchJson({url: 'rolesAdmin/allCurrentRoles'});
        this.roleOptions = resp ?? [];
    }
}

export const roleDetails = hoistCmp.factory({
    model: creates(RoleDetailsModel),

    render({model}) {
        return div({
            item: form({
                item: vbox(
                    hbox({
                        flex: 'none',
                        items: [
                            vbox({
                                flex: 1,
                                items: [
                                    formField({field: 'name', item: textInput()}),
                                    formField({
                                        field: 'groupName',
                                        item: textInput()
                                    })
                                ]
                            }),
                            vbox({
                                flex: 1,
                                items: [
                                    formField({
                                        field: 'lastUpdated',
                                        item: dateInput(),
                                        disabled: true
                                    }),
                                    formField({
                                        field: 'lastUpdatedBy',
                                        item: textInput(),
                                        disabled: true
                                    })
                                ]
                            })
                        ]
                    }),
                    formField({field: 'notes', item: textArea()}),
                    formField({
                        field: 'inherits',
                        item: select({
                            enableMulti: true,
                            // need to handle the workflow of if a user inputs a completely new role...
                            // enableCreate: true
                            options: model.roleOptions
                        })
                    })
                )
            }),
            style: {
                padding: '0.5em'
            }
        });
    }
});
