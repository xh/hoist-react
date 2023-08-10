import {fragment, hframe, p, vframe} from '@xh/hoist/cmp/layout';
import {HoistModel, XH, creates, hoistCmp, managed} from '@xh/hoist/core';
import {RecordAction} from '@xh/hoist/data';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import {makeObservable} from 'mobx';
import {detailPanel} from './DetailPanel';
import {RoleDialogModel, roleDialog} from './Dialog';
import {mainGrid} from './MainGrid';

export class InspectorTabModel extends HoistModel {
    @bindable selectedRoleName = null;
    @bindable.ref selectedRoleDetails = null;
    @bindable selModel;

    @managed dialogModel = new RoleDialogModel();

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        super.onLinked();

        this.addReaction({
            track: () => this.selectedRoleName,
            run: async role => {
                // this.detailModel.roleName = role;
            },
            fireImmediately: true
        });
    }

    addRoleAction = new RecordAction({
        icon: Icon.add(),
        text: 'Add',
        intent: 'success',
        actionFn: () => {
            this.dialogModel.openDialog('add');
        }
    });

    editRoleAction = new RecordAction({
        icon: Icon.edit(),
        text: 'Edit',
        intent: 'primary',
        actionFn: () => {
            this.dialogModel.openDialog('edit');
        },
        recordsRequired: 1
    });

    deleteRoleAction = new RecordAction({
        icon: Icon.delete(),
        text: 'Delete',
        intent: 'danger',
        actionFn: ({record}) => {
            console.log(record);
            this.getImpactDelete(record.data.name);
        },
        recordsRequired: 1
    });

    async getImpactEdit(roleDetails) {
        const resp = await XH.fetchJson({
            url: 'rolesAdmin/effectiveChanges',
            params: {roleDetails: roleDetails}
        });
        return resp;
    }

    async getImpactDelete(roleName) {
        const resp = await XH.fetchJson({
            url: 'rolesAdmin/effectiveChanges',
            params: {changeType: 'delete', roleName: roleName}
        });
        XH.confirm({
            message: p(
                `Caution! You're attemping to delete the role ${roleName}, which will also impact ${resp['userCount']} users and ${resp['inheritedRolesCount']} other (inheriting) roles. Are you sure you want to continue?`
            )
        });
        return resp;
    }
}

export const inspectorTab = hoistCmp.factory({
    model: creates(InspectorTabModel),

    render({model}) {
        console.log(model.selModel);
        return fragment(
            vframe(
                toolbar({
                    item: model.selModel
                        ? recordActionBar({
                              selModel: model.selModel,
                              actions: [
                                  model.addRoleAction,
                                  model.editRoleAction,
                                  model.deleteRoleAction
                              ]
                          })
                        : null,
                    omit: !XH.getConf('xhRoleManagerConfig').canWrite
                }),
                hframe(mainGrid(), detailPanel())
            ),
            roleDialog(model.dialogModel)
        );
    }
});
