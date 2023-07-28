import {HoistModel, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {makeObservable} from 'mobx';
import {Store} from '@xh/hoist/data';
import {InspectorTabModel} from '../../InspectorTab';
import {div} from '@xh/hoist/cmp/layout';

class allTabModel extends HoistModel {
    @lookup(() => InspectorTabModel) inspectorTab: InspectorTabModel;

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
                renderer: (v, {record}) => {
                    const reason = record.data?.reason;
                    return div({
                        style: {
                            fontStyle: 'italic'
                        },
                        item: `via ${reason}`
                    });
                }
            }
        ]
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

                this.store.loadData(role?.allUsers ?? []);
            },
            fireImmediately: true
        });
    }
}

export const allTab = hoistCmp.factory({
    model: creates(allTabModel),

    render({model}) {
        return grid({model: model.gridModel});
    }
});
