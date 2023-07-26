import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {makeObservable, observable} from 'mobx';
import {AllRolesPanelModel} from '../AllRolesPanelModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import {Store} from '@xh/hoist/data';

export class UsersWidgetModel extends HoistModel {
    @observable roleId = null;
    @observable roleDetails = null;

    @lookup(AllRolesPanelModel) parentModel;

    @managed store = new Store({
        fields: [{name: 'name', type: 'string'}],
        idSpec: r => {
            console.log(r);
            let result = 'role-' + this.roleId + '_user-' + r['name'];
            console.log(result);
            return result;
        }
    });

    @managed gridModel = new GridModel({
        emptyText: 'No inherited roles',
        store: this.store,
        hideHeaders: true,
        columns: [{field: 'name'}]
    });

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.parentModel.selectedRecord,
            run: role => {
                this.store.clear();
                this.roleId = role?.id ?? null;
                this.roleDetails = role?.data ?? null;
                this.store.loadData(this.records_of_users(this.roleDetails?.assignedUsers));
            },
            debounce: 30
        });
    }

    private records_of_users(users: string[]) {
        return users.map((str, index) => ({name: str}));
    }
}
