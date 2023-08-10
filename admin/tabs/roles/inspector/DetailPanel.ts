import {badge} from '@xh/hoist/cmp/badge';
import {hbox, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {TabContainerModel, tabContainer} from '@xh/hoist/cmp/tab';
import {HoistModel, XH, creates, hoistCmp, lookup} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from 'mobx';
import {InspectorTabModel} from './InspectorTab';
import {inheritedRolesTab} from './detail/InheritedRolesTab';
import {roleDetails} from './detail/RoleDetails';
import {usersTab} from './detail/UsersTab';

export class DetailPanelModel extends HoistModel {
    @lookup(() => InspectorTabModel) parent: InspectorTabModel;

    constructor() {
        super();
        makeObservable(this);

        this.addReaction({
            track: () => this.parent.selectedRoleName,
            run: _ => {
                this.loadAsync();
            },
            fireImmediately: true
        });
    }

    override async doLoadAsync() {
        // this.roleDetails = null;
        // prevent this from making a request if no roleName (ie on initial page load)
        if (this.parent.selectedRoleName) {
            const roleName = this.parent.selectedRoleName;
            const resp = await XH.fetchJson({
                url: 'rolesAdmin/roleDetails',
                params: {roleName: roleName}
            });
            // await wait(2 * SECONDS);
            const details = await resp;
            this.parent.selectedRoleDetails = details;
        } else {
            this.parent.selectedRoleDetails = null;
        }
    }
}

export const detailPanel = hoistCmp.factory({
    model: creates(DetailPanelModel),

    render({model}) {
        return panel({
            item: model.parent.selectedRoleName
                ? vframe(
                      roleDetails(),
                      tabContainer({
                          model: new TabContainerModel({
                              tabs: [
                                  {
                                      id: 'users',
                                      title: hbox(
                                          'Users',
                                          badge({
                                              item: `${model.parent.selectedRoleDetails?.allUsers?.length}`,
                                              compact: true
                                          })
                                      ),
                                      icon: Icon.users(),
                                      content: usersTab
                                  },
                                  {
                                      id: 'roles',
                                      title: hbox(
                                          'Inherited Roles',
                                          badge({
                                              item: `${model.parent.selectedRoleDetails?.inheritedRoles?.length}`,
                                              compact: true
                                          })
                                      ),
                                      icon: Icon.roles(),
                                      content: inheritedRolesTab
                                  }
                              ]
                          })
                      })
                  )
                : placeholder('Select a role to view details'),
            modelConfig: {
                side: 'right',
                defaultSize: 405,
                resizable: false
                // collapsible: false
            },
            mask: 'onLoad'
        });
    }
});
