import {gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, fragment, hframe, p, vframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {HoistModel, XH, creates, hoistCmp, managed} from '@xh/hoist/core';
import {RecordAction} from '@xh/hoist/data';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
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
    @bindable mainGridModel;
    @bindable mostRecentWarning;

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
            this.getImpactDelete(record.data.name);
        },
        recordsRequired: 1
    });

    async getImpactEdit(roleName, groupName, notes, users, inheritedRoles) {
        const resp = await XH.fetchJson({
            url: 'rolesAdmin/cascadeImpact',
            params: {
                changeType: 'edit',
                roleName: roleName,
                users: JSON.stringify(users),
                inheritedRoles: JSON.stringify(inheritedRoles)
            }
        });
        this.mostRecentWarning = resp['timestamp'];
        const userImpact = resp['userCount'];
        const roleImpact = resp['inheritedRolesCount'];
        // if (userImpact > 0 || roleImpact > 0) {
        XH.confirm({
            title: 'Confirm Edits',
            message: p(
                `Caution! You're attemping to edit the role ${roleName}, which will also impact ${userImpact} users and ${roleImpact} other (inheriting) roles. Are you sure you want to continue?`
            ),
            onConfirm: async () => {
                const editResp = await XH.fetchJson({
                    url: 'rolesAdmin/updateRole',
                    params: {
                        roleName: roleName,
                        timestamp: this.mostRecentWarning,
                        groupName: groupName,
                        notes: notes,
                        users: JSON.stringify(users),
                        inheritedRoles: JSON.stringify(inheritedRoles)
                    }
                });
                // this reload isn't triggering... probably the wrong way to call
                // but want to refresh the main grid after editing!
                this.mainGridModel.doLoadAsync();
                console.log(editResp);
            }
        });
        // }
        return resp;
    }

    async getImpactDelete(roleName) {
        const resp = await XH.fetchJson({
            url: 'rolesAdmin/cascadeImpact',
            params: {changeType: 'delete', roleName: roleName}
        });
        this.mostRecentWarning = resp['timestamp'];
        XH.confirm({
            title: 'Confirm Delete',
            message: p(
                `Caution! You're attemping to delete the role ${roleName}, which will also impact ${resp['userCount']} users and ${resp['inheritedRolesCount']} other (inheriting) roles. Are you sure you want to continue?`
            ),
            onConfirm: async () => {
                const delResp = await XH.fetchJson({
                    url: 'rolesAdmin/deleteRole',
                    params: {roleName: roleName, timestamp: this.mostRecentWarning}
                });
                // this reload isn't triggering... probably the wrong way to call
                // but want to refresh the main grid after doing a deletion!
                this.mainGridModel.doLoadAsync();
                console.log(delResp);
            }
        });
        this.dialogModel.closeDialog();
        return resp;
    }
}

export const inspectorTab = hoistCmp.factory({
    model: creates(InspectorTabModel),

    render({model}) {
        return fragment(
            vframe(
                toolbar({
                    item: model.mainGridModel?.selModel
                        ? [
                              recordActionBar({
                                  selModel: model.mainGridModel?.selModel,
                                  actions: [
                                      model.addRoleAction,
                                      model.editRoleAction,
                                      model.deleteRoleAction
                                  ]
                              }),
                              filler(),
                              gridCountLabel({unit: 'roles'}),
                              storeFilterField(),
                              exportButton()
                          ]
                        : null,
                    omit: !XH.getConf('xhRoleManagerConfig').canWrite
                }),
                hframe(mainGrid(), detailPanel())
            ),
            roleDialog(model.dialogModel)
        );
    }
});
