import {HoistModel, lookup, managed} from '@xh/hoist/core';
import {makeObservable, observable} from 'mobx';
import {AllRolesPanelModel} from '../AllRolesPanelModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import {Store} from '@xh/hoist/data';

export class RolesWidgetModel extends HoistModel {
    @observable roleId = null;
    @observable roleDetails = null;

    @lookup(AllRolesPanelModel) parentModel;

    @managed store = new Store({
        fields: [{name: 'name', type: 'string'}],
        idSpec: r => {
            return 'role-' + this.roleId + '_role-' + r['name'];
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
                this.store.loadData(this.roleDetails?.inherits ?? []);
            },
            debounce: 30,
            fireImmediately: true
        });
    }
}
