import {HoistModel, XH, managed} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data/Store';

export class RolesTabModel extends HoistModel {
    @managed store = this.createStore();

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
