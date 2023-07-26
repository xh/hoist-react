import {HoistModel, XH, managed} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data/Store';
import {AllRolesPanelModel} from './AllRolesPanelModel';

export class RolesTabModel extends HoistModel {
    @managed store = this.createStore();

    // remove the refedrence to parentModel (let it find)
    @managed allRolesPanelModel = new AllRolesPanelModel({parentModel: this});
    // definitely don't need to create this model twice
    // @managed roleDetailPanelModel = new RoleDetailPanelModel();

    // could add a getter that references the allRolesPanel model to get the selected role (then can just reference the parent)

    private createStore() {
        return new Store({
            idSpec: 'name',
            fields: [
                {name: 'name', type: 'string'},
                {name: 'groupName', type: 'string'},
                {name: 'notes', type: 'string'},
                {name: 'inherits', type: 'json'},
                {name: 'assignedUsers', type: 'json'},
                {name: 'allUsers', type: 'json'},
                {name: 'lastUpdated', type: 'date'},
                {name: 'lastUpdatedBy', type: 'string'}
            ]
        });
    }

    override async doLoadAsync() {
        const resp = await XH.fetchJson({url: 'rest/rolesAdmin'});
        this.store.loadData(resp.data);
    }
}
