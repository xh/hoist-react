import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {div} from '@xh/hoist/cmp/layout';
import {HoistModel, creates, hoistCmp, managed} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {makeObservable, observable} from 'mobx';
import {DetailPanelModel} from '../../DetailPanel';

class allTabModel extends HoistModel {
    @observable.ref roleDetails = null;

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
        ],
        selModel: 'multiple'
    });

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.lookupModel(DetailPanelModel).roleDetails,
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
