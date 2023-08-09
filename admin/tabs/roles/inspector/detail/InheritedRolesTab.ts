import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {HoistModel, creates, hoistCmp, managed} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {makeObservable} from 'mobx';
import {InspectorTabModel} from '../InspectorTab';

class InheritedRolesTabModel extends HoistModel {
    @managed store = new Store({
        fields: [
            {name: 'role', type: 'string'},
            {name: 'reason', type: 'string'}
        ],
        idSpec: 'role'
    });

    @managed gridModel = new GridModel({
        emptyText: "This role doesn't inherit any additional roles",
        store: this.store,
        hideHeaders: true,
        columns: [
            {field: 'role'},
            {
                field: 'reason',
                hidden: true
            }
        ],
        groupBy: 'reason',
        groupRowRenderer: ({value}) => this.roleReason(value),
        groupSortFn: (a, b) => this.roleReason(a).localeCompare(this.roleReason(b)),
        sortBy: 'role'
    });

    roleReason(parentRoleName) {
        const currentRoleName = this.lookupModel(InspectorTabModel).selectedRoleName;
        if (parentRoleName === currentRoleName) {
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
                this.store.loadData(role?.inheritedRoles ?? []);
            },
            fireImmediately: true
        });
    }
}

export const inheritedRolesTab = hoistCmp.factory({
    model: creates(InheritedRolesTabModel),

    render({model}) {
        return grid({model: model.gridModel});
    }
});
