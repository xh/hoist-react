import {HoistModel, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {makeObservable} from 'mobx';
import {Store} from '@xh/hoist/data';
import {InspectorTabModel} from '../../InspectorTab';

class assignedTabModel extends HoistModel {
    @lookup(() => InspectorTabModel) mainGrid: InspectorTabModel;

    @managed store = new Store({
        fields: [{name: 'user', type: 'string'}],
        idSpec: 'user'
    });

    @managed gridModel = new GridModel({
        emptyText: 'No users assigned to this role',
        store: this.store,
        hideHeaders: true,
        columns: [{field: 'user'}]
    });

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.mainGrid.selectedRole,
            run: role => {
                this.store.clear();

                console.log(
                    JSON.stringify(role?.assignedUsers?.map((it: string, _) => ({user: it})) ?? [])
                );
                this.store.loadData(
                    role?.assignedUsers?.map((it: string, _) => ({user: it})) ?? []
                );
            },
            fireImmediately: true
        });
    }
}

export const assignedTab = hoistCmp.factory({
    model: creates(assignedTabModel),

    render({model}) {
        return grid({model: model.gridModel});
    }
});
