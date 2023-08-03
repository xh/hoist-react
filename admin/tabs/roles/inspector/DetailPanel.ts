import {hr, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {HoistModel, XH, hoistCmp, uses} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {bindable} from '@xh/hoist/mobx';
import {makeObservable} from 'mobx';
import {roleDetails} from './detail/RoleDetails';
import {usersTabContainer} from './detail/UsersTabContainer';

export class DetailPanelModel extends HoistModel {
    @bindable roleId = null;

    @bindable.ref roleDetails = null;

    constructor() {
        super();
        makeObservable(this);

        this.addReaction({
            track: () => this.roleId,
            run: roleId => {
                this.loadAsync();
            },
            fireImmediately: true
        });
    }

    async loadRoleDetails(roleId) {}

    override async doLoadAsync() {
        this.roleDetails = null;
        // prevent this from making a request if no roleId (ie on initial page load)
        if (this.roleId) {
            const roleId = this.roleId;
            const resp = await XH.fetchJson({
                url: 'rolesAdmin/roleDetails',
                params: {roleId}
            });
            // await wait(2 * SECONDS);
            this.roleDetails = await resp;
        }
    }
}

export const detailPanel = hoistCmp.factory({
    model: uses(DetailPanelModel),

    render({model}) {
        return panel({
            item: model.roleId
                ? vframe(
                      roleDetails(),
                      hr({style: {width: '60%', border: 'var(--xh-border-solid)'}}),
                      usersTabContainer()
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
