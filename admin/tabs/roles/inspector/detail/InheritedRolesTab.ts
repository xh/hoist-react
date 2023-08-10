import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {div} from '@xh/hoist/cmp/layout';
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
        columns: [
            {field: 'role'},
            {
                field: 'reason',
                renderer: value =>
                    div({
                        item: `${this.roleReason(value)}`,
                        style: {color: 'var(--xh-text-color-muted)'}
                    })
            }
        ],
        sortBy: {
            colId: 'reason',
            sort: 'asc'
        }
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
