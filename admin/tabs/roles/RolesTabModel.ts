import {HoistModel, XH, managed} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data/Store';
import {AllRolesPanelModel} from './AllRolesPanelModel';
import {RoleDetailPanelModel} from './details/RoleDetailPanelModel';

export class RolesTabModel extends HoistModel {
    @managed store = this.createStore();

    @managed allRolesPanelModel = new AllRolesPanelModel({parentModel: this});
    @managed roleDetailPanelModel = new RoleDetailPanelModel();

    private createStore() {
        return new Store({
            processRawData: r => {
                return {...r};
            },
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
        const data = await XH.fetchJson({url: 'rest/rolesAdmin'});
        this.store.loadData(data['data']);
    }
}
