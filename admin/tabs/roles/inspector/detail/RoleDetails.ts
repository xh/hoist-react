import {FormModel, form} from '@xh/hoist/cmp/form';
import {div, filler, hbox, vbox} from '@xh/hoist/cmp/layout';
import {HoistModel, XH, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {dateInput, select, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {compactDateRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import {makeObservable} from 'mobx';
import {DetailPanelModel} from '../DetailPanel';

class RoleDetailsModel extends HoistModel {
    @lookup(() => DetailPanelModel) parent: DetailPanelModel;

    @managed
    formModel = new FormModel({
        fields: [
            {
                name: 'name',
                readonly: !XH.getConf('xhRoleManagerConfig').canWrite
            },
            {
                name: 'groupName',
                readonly: !XH.getConf('xhRoleManagerConfig').canWrite
            },
            {
                name: 'lastUpdated',
                readonly: true
            },
            {
                name: 'notes',
                readonly: !XH.getConf('xhRoleManagerConfig').canWrite
            },
            {
                name: 'inherits',
                readonly: !XH.getConf('xhRoleManagerConfig').canWrite
            }
        ]
    });

    @bindable.ref roleOptions = [];

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.lookupModel(DetailPanelModel).roleDetails,
            run: role => {
                // assign values
                this.formModel.fields.name.setValue(role?.name);
                this.formModel.fields.groupName.setValue(role?.groupName);
                this.formModel.fields.lastUpdated.setValue({
                    lastUpdatedBy: role?.lastUpdatedBy,
                    lastUpdated: role?.lastUpdated
                });
                this.formModel.fields.notes.setValue(role?.notes);
                this.formModel.fields.inherits.setValue(role?.inherits);
            }
        });
    }

    override async doLoadAsync() {
        const resp = await XH.fetchJson({url: 'rolesAdmin/allCurrentRoles'});
        this.roleOptions = resp ?? [];
    }

    reset() {
        window.alert('Reset ✅');
    }

    async submitAsync() {
        window.alert('Submitted ✅');
    }
}

export const roleDetails = hoistCmp.factory({
    model: creates(RoleDetailsModel),

    render({model}) {
        return div({
            item: form({
                item: vbox(
                    div({
                        items: [
                            formField({
                                field: 'lastUpdated',
                                item: dateInput(),
                                inline: true,
                                label: null,
                                readonlyRenderer: r => {
                                    const date = compactDateRenderer()(r?.lastUpdated);
                                    return r?.lastUpdated && r?.lastUpdatedBy
                                        ? `Last updated by: ${r?.lastUpdatedBy} (${date})`
                                        : 'Last updated by: ';
                                    // doesn't seem to apply on initial
                                    // page load. Odd.
                                },
                                // padding doesn't want to go away either..
                                // super odd
                                style: {padding: 0}
                            })
                        ],
                        style: {fontStyle: 'italic', color: 'var(--xh-text-color-muted)'}
                    }),
                    hbox({
                        flex: 'none',
                        items: [
                            formField({
                                field: 'name',
                                item: textInput(),
                                flex: 1
                            }),
                            formField({
                                field: 'groupName',
                                item: textInput(),
                                flex: 1
                            })
                        ]
                    }),
                    formField({
                        field: 'notes',
                        item: textArea()
                    }),
                    formField({
                        field: 'inherits',
                        item: select({
                            enableMulti: true,
                            // need to handle the workflow of if a user inputs a completely new role...
                            // enableCreate: true
                            options: model.roleOptions
                        })
                    }),
                    hbox({
                        items: [
                            button({
                                text: 'Reset',
                                icon: Icon.reset({className: 'xh-red'}),
                                onClick: () => model.reset(),
                                disabled: !model.formModel.isDirty
                            }),
                            filler(),
                            button({
                                text: 'Submit Changes',
                                icon: Icon.check(),
                                minimal: false,
                                intent: 'success',
                                onClick: () => model.submitAsync()
                            })
                        ],
                        style: {marginBottom: '0.5rem'}
                    })
                )
            }),
            style: {
                padding: '1em'
            }
        });
    }
});
