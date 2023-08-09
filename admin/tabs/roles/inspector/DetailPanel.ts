import {div, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {tabContainer} from '@xh/hoist/cmp/tab';
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
            this.parent.selectedRoleDetails = await resp;
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
                      div({
                          style: {
                              width: '100%',
                              height: '0.5em',
                              left: 0,
                              top: 0,
                              backgroundColor: model.parent.selectedRoleDetails?.color
                          }
                      }),
                      roleDetails(),
                      tabContainer({
                          modelConfig: {
                              tabs: [
                                  {
                                      id: 'users',
                                      title: 'Users',
                                      icon: Icon.users(),
                                      content: usersTab
                                  },
                                  {
                                      id: 'roles',
                                      title: 'Inherited Roles',
                                      icon: Icon.roles(),
                                      content: inheritedRolesTab
                                  }
                              ]
                          }
                      })
                  )
                : placeholder('Select a role to view details'),
            modelConfig: {
                side: 'right',
                defaultSize: 350,
                resizable: true,
                collapsible: true,
                minSize: 290
            },
            mask: 'onLoad'
        });
    }
});
