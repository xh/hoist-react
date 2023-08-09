import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {HoistModel, creates, hoistCmp, managed} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {makeObservable} from 'mobx';
import {InspectorTabModel} from '../InspectorTab';

class UsersTabModel extends HoistModel {
    @managed store = new Store({
        fields: [
            {name: 'user', type: 'string'},
            {name: 'reason', type: 'string'}
        ],
        idSpec: 'user'
    });

    @managed gridModel = new GridModel({
        emptyText: 'No user are assigned or inherit this role',
        store: this.store,
        hideHeaders: true,
        columns: [
            {field: 'user'},
            {
                field: 'reason',
                hidden: true
            }
        ],
        groupBy: 'reason',
        showGroupRowCounts: true,
        groupRowRenderer: ({value}) => this.roleReason(value),
        sortBy: 'user'
    });

    roleReason(parentRoleName) {
        const currentRoleName = this.lookupModel(InspectorTabModel).selectedRoleName;
        if (parentRoleName == currentRoleName) {
            return 'Assigned';
        } else {
            return 'via ' + parentRoleName;
        }
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.lookupModel(InspectorTabModel).selectedRoleDetails,
            run: role => {
                this.store.clear();
                this.store.loadData(role?.allUsers ?? []);
            },
            fireImmediately: true
        });
    }
}

export const usersTab = hoistCmp.factory({
    model: creates(UsersTabModel),

    render({model}) {
        return grid({model: model.gridModel});
    }
});
