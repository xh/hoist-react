import {HoistModel, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {makeObservable} from 'mobx';
import {Store} from '@xh/hoist/data';
import {InspectorTabModel} from '../../InspectorTab';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {vframe} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/desktop/cmp/button';

class assignedTabModel extends HoistModel {
    @lookup(() => InspectorTabModel) inspectorTab: InspectorTabModel;

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
            track: () => this.inspectorTab.selectedRole,
            run: role => {
                this.store.clear();

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
        return vframe(
            toolbar({
                items: [
                    button({
                        icon: Icon.add(),
                        text: 'Assign User',
                        intent: 'success'
                    }),
                    button({
                        icon: Icon.edit(),
                        text: 'Edit',
                        intent: 'primary'
                    }),
                    button({
                        icon: Icon.delete(),
                        text: 'Delete',
                        intent: 'danger'
                    })
                ],
                compact: true
                // vertical: true
            }),
            grid({model: model.gridModel})
        );
    }
});
