import {fragment, hframe, p} from '@xh/hoist/cmp/layout';
import {HoistModel, XH, creates, hoistCmp, managed} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {makeObservable} from 'mobx';
import {detailPanel} from './DetailPanel';
import {RoleDialogModel, roleDialog} from './Dialog';
import {mainGrid} from './MainGrid';

export class InspectorTabModel extends HoistModel {
    @bindable selectedRoleName = null;
    @bindable.ref selectedRoleDetails = null;

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

    addRole() {
        this.dialogModel.openDialog('add');
    }

    editRole() {
        this.dialogModel.openDialog('edit');
    }

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
        return fragment(hframe(mainGrid(), detailPanel()), roleDialog(model.dialogModel));
    }
});
