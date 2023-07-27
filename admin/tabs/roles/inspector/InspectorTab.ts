import {hframe, vframe} from '@xh/hoist/cmp/layout';
import {HoistModel, creates, hoistCmp} from '@xh/hoist/core';
import {userDetailPanel} from './UserDetailPanel';
import {makeObservable, observable} from 'mobx';
import {rolesGrid} from './RolesGrid';
import {roleDetailPanel} from './RoleDetailPanel';

export class InspectorTabModel extends HoistModel {
    @observable.ref selectedRole = null;

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.selectedRole,
            run: role => {
                console.log('role selection: ' + this.selectedRole);
            }
        });
    }
}

export const inspectorTab = hoistCmp.factory({
    model: creates(InspectorTabModel),

    render() {
        // console.log(model);
        return hframe({
            items: [
                vframe(rolesGrid(), roleDetailPanel()),
                userDetailPanel()
                // allRolesPanel()
                // panel({
                //     title: 'Role Details',
                //     item: userDetailPanel(),
                //     modelConfig: {
                //         side: 'right',
                //         defaultSize: '50%'
                //     }
                // })
            ]
        });
    }
});
